# AI Auto-Highlight Training Guide
## Train Custom Models on Your 9TB Drone Footage Library

This guide walks you through training a custom AI model to automatically detect highlights in your drone footage based on YOUR preferences.

---

## 🎯 Overview

**What You'll Build:**
- Custom AI model that learns what YOU consider "highlight-worthy"
- Batch processor for your entire 9TB library
- Automatic highlight reel generation

**Time Investment:**
- Initial setup: 1-2 hours
- Labeling footage: 2-4 hours (one-time)
- Training: 1-3 hours (automated)
- Batch processing 9TB: 12-24 hours (overnight)

**Hardware Options:**
1. **Local GPU** - Your own NVIDIA GPU (recommended if you have one)
2. **Cloud GPU** - Google Colab free tier (good for training only)
3. **CPU Only** - Works but very slow (testing only)

---

## 📋 Step 1: Label Your Footage (2-4 hours)

The model learns from examples you provide. You need to show it what makes a good highlight.

### Create `labels.json`

```json
{
  "highlights": [
    "/media/drone-footage/2024-06-15/epic_sunset_flight.mp4",
    "/media/drone-footage/2024-08-20/proximity_through_trees.mp4",
    "/media/drone-footage/2023-12-10/waterfall_dive.mp4",
    "/media/drone-footage/2024-03-05/fast_racing_line.mp4"
  ],
  "normal": [
    "/media/drone-footage/2024-06-15/takeoff_test.mp4",
    "/media/drone-footage/2024-08-20/battery_check.mp4",
    "/media/drone-footage/2023-12-10/boring_transit.mp4",
    "/media/drone-footage/2024-03-05/preflight_warmup.mp4"
  ]
}
```

### How Many Clips to Label?

| Dataset Size | Training Time | Expected Accuracy | Best For |
|--------------|---------------|-------------------|----------|
| 50 each (100 total) | 30 min | 70-80% | Quick test |
| 200 each (400 total) | 2 hours | 85-90% | Good results |
| 500 each (1000 total) | 3-4 hours | 90-95% | Production quality |

**Recommendation:** Start with 50 of each, train, test results. If accuracy is low, add more examples.

### Tips for Labeling

**Highlights should include:**
- Epic scenery (sunsets, mountains, waterfalls)
- Technical skill (proximity flying, smooth maneuvers)
- Action sequences (racing, chasing, diving)
- Unique perspectives (unusual angles, creative shots)

**Normal footage includes:**
- Takeoffs and landings
- Battery/equipment checks
- Transit footage (flying to location)
- Test flights
- Boring/static shots

**Pro Tips:**
- Pick diverse examples (different times of day, locations, weather)
- Include edge cases (what's almost a highlight but not quite?)
- Label consistently (use same criteria for all clips)
- Review your labels - are they accurate to YOUR preferences?

---

## 🔧 Step 2: Prepare Training Dataset

Run this inside the worker container:

```bash
# Enter the worker container
docker exec -it quadvault-worker-dev bash

# Prepare dataset (extracts frames from your labeled clips)
node aiTrainer.js prepare-dataset /path/to/labels.json /tmp/training
```

**What this does:**
- Extracts 1 frame per second from each video
- Organizes frames into highlight/normal folders
- Creates `dataset.json` with frame paths and labels

**Example output:**
```
[AI Trainer] Preparing training dataset...
[AI Trainer] Processing 200 highlight clips...
[AI Trainer] Processing 200 normal clips...
[AI Trainer] Dataset prepared: 4,532 frames
  - Highlights: 2,301
  - Normal: 2,231
  - Saved to: /tmp/training/dataset.json
```

---

## 🚀 Step 3: Train the Model

### Option A: Local GPU Training (Recommended)

**Requirements:**
- NVIDIA GPU with 8GB+ VRAM (RTX 3060, 3070, 4060, etc.)
- Your Docker setup already has GPU support!

**Install PyTorch in worker container:**

```bash
docker exec -it quadvault-worker-dev bash
pip3 install torch torchvision pillow tqdm
```

**Start training:**

```bash
python3 train_classifier.py /tmp/training/dataset.json --epochs 50 --batch-size 32
```

**Training output:**
```
================================================================================
DRONE FOOTAGE HIGHLIGHT CLASSIFIER TRAINING
================================================================================

Device: cuda
GPU: NVIDIA GeForce RTX 3070
VRAM: 8.00 GB

Loading dataset from /tmp/training/dataset.json...
Training samples: 3625
Validation samples: 907

Initializing model...

Starting training for 50 epochs...
--------------------------------------------------------------------------------
Epoch 1/50 [Train]: 100%|████████| loss: 0.5234, acc: 73.45%
Epoch 1/50 [Val]:   100%|████████| loss: 0.4123, acc: 81.23%

Epoch 1 Summary:
  Train Loss: 0.5234 | Train Acc: 73.45%
  Val Loss:   0.4123 | Val Acc:   81.23%
  ✓ Saved best model (Val Acc: 81.23%)
--------------------------------------------------------------------------------
...
Epoch 50/50 [Train]: 100%|████████| loss: 0.1234, acc: 95.67%
Epoch 50/50 [Val]:   100%|████████| loss: 0.1456, acc: 93.12%

================================================================================
TRAINING COMPLETE!
================================================================================
Best Validation Accuracy: 93.12%
Model saved to: /tmp/training/model.pth
```

### Option B: Cloud GPU Training (Google Colab)

Good if you don't have a GPU or want to preserve local resources.

**1. Upload dataset to Google Drive**

```bash
# Compress dataset
tar -czf training-dataset.tar.gz /tmp/training

# Upload to Google Drive via web interface
```

**2. Open Google Colab notebook**

Create new notebook: https://colab.research.google.com

**3. Copy training code**

```python
# Install dependencies
!pip install torch torchvision pillow tqdm

# Upload the train_classifier.py script
# (copy contents from worker/train_classifier.py)

# Mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Extract dataset
!tar -xzf /content/drive/MyDrive/training-dataset.tar.gz

# Train model
!python train_classifier.py /content/training/dataset.json --epochs 50
```

**4. Download trained model**

After training completes, download `model.pth` from Colab to your local machine.

---

## 📊 Step 4: Evaluate Model Performance

Before running on your entire 9TB library, test the model on some videos:

```bash
# Test on a single video
node aiTrainer.js test-video /path/to/test-video.mp4 /tmp/training/model.pth

# Output:
# [AI Trainer] Analyzing: test-video.mp4
# [AI Trainer] Highlight score: 0.87 (87% confidence this is a highlight)
```

**Interpreting Results:**

| Score | Meaning | Action |
|-------|---------|--------|
| 0.9+ | High confidence highlight | Perfect! |
| 0.7-0.9 | Likely highlight | Good |
| 0.5-0.7 | Uncertain | Review these manually |
| 0.3-0.5 | Likely normal | Good |
| 0-0.3 | High confidence normal | Perfect! |

**If accuracy is low (<80%):**
1. Add more labeled examples (especially edge cases)
2. Review your labels for consistency
3. Retrain with more epochs
4. Try different learning rates (--learning-rate 0.0001)

---

## 🎬 Step 5: Batch Process Your 9TB Library

Once you're happy with model accuracy, process your entire library:

```bash
# Batch classify all footage
node aiTrainer.js batch-classify \
  /media/drone-footage \
  /tmp/training/model.pth \
  /tmp/highlights.json
```

**What happens:**
1. Scans all videos in `/media/drone-footage` recursively
2. Extracts sample frames from each video
3. Scores each video using trained model
4. Saves highlights (score >0.7) to `highlights.json`

**Progress tracking:**
```
[AI Trainer] Starting batch classification...
  Library: /media/drone-footage
  Model: /tmp/training/model.pth
[AI Trainer] Found 18,432 videos to process

[AI Trainer] Processed 100/18432 videos...
[AI Trainer] Processed 200/18432 videos...
...
[AI Trainer] Processed 18432/18432 videos...

[AI Trainer] Batch classification complete!
  Total scanned: 18,432
  Highlights found: 1,247
  Results saved to: /tmp/highlights.json
```

**Performance estimates:**

| Hardware | Speed | 9TB (18k videos) Time |
|----------|-------|----------------------|
| RTX 4090 | 8-10 videos/sec | 6-8 hours |
| RTX 3070 | 4-6 videos/sec | 12-18 hours |
| RTX 3060 | 2-4 videos/sec | 18-24 hours |
| CPU only | 0.2-0.5 videos/sec | 10-20 days ❌ |

**Run overnight:**
```bash
# Run in background with logs
nohup node aiTrainer.js batch-classify /media/drone-footage /tmp/training/model.pth /tmp/highlights.json > batch-classify.log 2>&1 &

# Check progress
tail -f batch-classify.log

# Check if complete
ps aux | grep aiTrainer
```

---

## 🎥 Step 6: Generate Highlight Reels

After batch processing, create automatic highlight reels:

```bash
# Create a highlight reel from top 50 clips
node aiTrainer.js create-reel \
  /tmp/highlights.json \
  /tmp/best-of-2024.mp4 \
  --top 50 \
  --min-score 0.85
```

**Options:**
- `--top N` - Include top N scoring clips
- `--min-score X` - Only include clips with score >X
- `--duration X` - Max duration in seconds
- `--transitions` - Add crossfade transitions

---

## 🔄 Continuous Improvement

### Retrain with New Footage

As you collect more footage, improve your model:

```bash
# Add new labels to labels.json
{
  "highlights": [
    ...existing...,
    "/media/drone-footage/2025-01-10/new_epic_shot.mp4"
  ]
}

# Prepare updated dataset (merges with existing)
node aiTrainer.js prepare-dataset labels.json /tmp/training --merge

# Retrain
python3 train_classifier.py /tmp/training/dataset.json --epochs 30
```

### Share Your Model

Your trained model is only ~50MB! Share with friends:

```bash
# Backup model
cp /tmp/training/model.pth ~/drone-highlight-model-v1.pth

# Share via USB/cloud
# Friends can use your model without retraining!
```

---

## 💡 Advanced Tips

### Multiple Models for Different Styles

Train separate models for different footage types:

```bash
# Model for racing footage
python3 train_classifier.py racing-dataset.json --output-dir /models/racing

# Model for cinematic shots
python3 train_classifier.py cinematic-dataset.json --output-dir /models/cinematic

# Model for proximity flying
python3 train_classifier.py proximity-dataset.json --output-dir /models/proximity
```

### Ensemble Predictions

Combine multiple models for better accuracy:

```javascript
const racingScore = await classifyWithModel('racing-model.pth', video);
const cinematicScore = await classifyWithModel('cinematic-model.pth', video);
const finalScore = (racingScore + cinematicScore) / 2;
```

### GPU Optimization

Maximize GPU utilization:

```bash
# Increase batch size if you have VRAM
python3 train_classifier.py dataset.json --batch-size 64  # Needs 12GB+ VRAM

# Multi-GPU training
python3 train_classifier.py dataset.json --multi-gpu
```

---

## 🐛 Troubleshooting

### "CUDA out of memory"
- Reduce batch size: `--batch-size 16`
- Close other GPU applications
- Reduce image resolution in code

### "Model accuracy stuck at 50%"
- Add more diverse training examples
- Check labels for consistency
- Increase number of epochs
- Try different learning rate

### "Batch processing too slow"
- Use GPU instead of CPU
- Process in smaller batches
- Parallelize across multiple GPUs

### "Model doesn't match my preferences"
- Review your labeled examples
- Be more consistent with labeling criteria
- Add more edge case examples
- Retrain with adjusted labels

---

## 📚 Technical Details

### Model Architecture
- **Backbone:** ResNet18 (pre-trained on ImageNet)
- **Fine-tuning:** Last layers retrained on your footage
- **Input:** 224x224 RGB images
- **Output:** Binary classification (highlight/normal)
- **Size:** ~50MB

### Training Process
1. Extract frames from labeled videos
2. Split into train/validation (80/20)
3. Data augmentation (flips, rotations, color jitter)
4. Transfer learning from ImageNet weights
5. Fine-tune on drone footage
6. Save best model based on validation accuracy

### Inference Pipeline
1. Extract sample frames from video
2. Preprocess frames (resize, normalize)
3. Run through trained model
4. Average frame scores for video score
5. Threshold for highlight classification

---

## 🎓 Next Steps

1. **Start simple:** Label 50-100 clips, train, evaluate
2. **Iterate:** Add more examples where model struggles
3. **Scale up:** Once accuracy is good, process full library
4. **Automate:** Set up scheduled jobs for new footage

**Questions or issues?** Check the code comments in:
- `worker/aiTrainer.js` - Dataset preparation
- `worker/train_classifier.py` - Model training
- `worker/aiSceneDetector.js` - CLIP-based scoring

Happy training! 🚁✨
