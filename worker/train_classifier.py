#!/usr/bin/env python3
"""
Custom Drone Footage Highlight Classifier Trainer

This script trains a neural network to recognize highlights in your drone footage
based on your personal preferences. It learns from the clips you've labeled as
"highlight" vs "normal".

Requirements:
  pip install torch torchvision pillow tqdm

Usage:
  python3 train_classifier.py /tmp/training/dataset.json --epochs 50 --batch-size 32

The trained model will be saved as model.pth and can be used for batch processing
your entire 9TB library.
"""

import json
import os
import sys
from pathlib import Path
import argparse

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
from tqdm import tqdm


class DroneFootageDataset(Dataset):
    """Dataset class for drone footage frames"""
    
    def __init__(self, dataset_json, transform=None):
        with open(dataset_json) as f:
            data = json.load(f)
        
        self.frames = data['frames']
        self.labels = data['labels']
        self.transform = transform
        
    def __len__(self):
        return len(self.frames)
    
    def __getitem__(self, idx):
        img_path = self.frames[idx]
        image = Image.open(img_path).convert('RGB')
        label = self.labels[idx]
        
        if self.transform:
            image = self.transform(image)
        
        return image, label


class HighlightClassifier(nn.Module):
    """Neural network for classifying highlights
    
    Uses ResNet18 as backbone (pre-trained on ImageNet)
    Fine-tuned for drone footage highlight detection
    """
    
    def __init__(self, num_classes=2):
        super(HighlightClassifier, self).__init__()
        
        # Load pre-trained ResNet18
        self.backbone = models.resnet18(pretrained=True)
        
        # Replace final layer for binary classification
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_features, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )
        
    def forward(self, x):
        return self.backbone(x)


def train_model(dataset_path, output_dir, epochs=50, batch_size=32, learning_rate=0.001):
    """Train the highlight classifier"""
    
    print("=" * 80)
    print("DRONE FOOTAGE HIGHLIGHT CLASSIFIER TRAINING")
    print("=" * 80)
    
    # Setup device (GPU if available)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nDevice: {device}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    else:
        print("WARNING: Training on CPU will be very slow!")
        print("Consider using Google Colab for free GPU access.")
    
    # Data transformations
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Load dataset
    print(f"\nLoading dataset from {dataset_path}...")
    dataset = DroneFootageDataset(dataset_path, transform=train_transform)
    
    # Split into train/validation (80/20)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    
    print(f"Training samples: {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    # Initialize model
    print("\nInitializing model...")
    model = HighlightClassifier(num_classes=2).to(device)
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', patience=5, factor=0.5)
    
    # Training loop
    best_val_acc = 0.0
    print(f"\nStarting training for {epochs} epochs...")
    print("-" * 80)
    
    for epoch in range(epochs):
        # Training phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        train_bar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs} [Train]")
        for images, labels in train_bar:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = outputs.max(1)
            train_total += labels.size(0)
            train_correct += predicted.eq(labels).sum().item()
            
            train_bar.set_postfix({
                'loss': f"{train_loss/len(train_bar):.4f}",
                'acc': f"{100.*train_correct/train_total:.2f}%"
            })
        
        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            val_bar = tqdm(val_loader, desc=f"Epoch {epoch+1}/{epochs} [Val]  ")
            for images, labels in val_bar:
                images, labels = images.to(device), labels.to(device)
                
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()
                
                val_bar.set_postfix({
                    'loss': f"{val_loss/len(val_bar):.4f}",
                    'acc': f"{100.*val_correct/val_total:.2f}%"
                })
        
        # Calculate metrics
        train_acc = 100. * train_correct / train_total
        val_acc = 100. * val_correct / val_total
        
        print(f"\nEpoch {epoch+1} Summary:")
        print(f"  Train Loss: {train_loss/len(train_loader):.4f} | Train Acc: {train_acc:.2f}%")
        print(f"  Val Loss:   {val_loss/len(val_loader):.4f} | Val Acc:   {val_acc:.2f}%")
        
        # Update learning rate
        scheduler.step(val_acc)
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            model_path = os.path.join(output_dir, 'model.pth')
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
            }, model_path)
            print(f"  ✓ Saved best model (Val Acc: {val_acc:.2f}%)")
        
        print("-" * 80)
    
    print("\n" + "=" * 80)
    print("TRAINING COMPLETE!")
    print("=" * 80)
    print(f"Best Validation Accuracy: {best_val_acc:.2f}%")
    print(f"Model saved to: {os.path.join(output_dir, 'model.pth')}")
    print("\nNext steps:")
    print("  1. Test the model on some videos")
    print("  2. If accuracy is good (>80%), run batch classification on 9TB library")
    print("  3. If accuracy is low, add more labeled examples and retrain")


def main():
    parser = argparse.ArgumentParser(description='Train drone footage highlight classifier')
    parser.add_argument('dataset', type=str, help='Path to dataset.json file')
    parser.add_argument('--epochs', type=int, default=50, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--learning-rate', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--output-dir', type=str, default=None, help='Output directory for model')
    
    args = parser.parse_args()
    
    # Set output directory
    output_dir = args.output_dir or os.path.dirname(args.dataset)
    os.makedirs(output_dir, exist_ok=True)
    
    # Train model
    train_model(
        dataset_path=args.dataset,
        output_dir=output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate
    )


if __name__ == '__main__':
    main()
