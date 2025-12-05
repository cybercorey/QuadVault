# AI Auto-Highlight Quick Start Guide
## Step-by-Step Instructions for Training on Your 9TB Library

---

## 🎯 What You're Building

An AI system that automatically detects highlights in your drone footage by:
1. Learning from examples YOU label as "highlight" vs "normal"
2. Training a custom model on your preferences
3. Batch processing your entire 9TB library overnight
4. Generating a list of all your best clips

**No cloud costs • Runs on your hardware • Completely private**

---

## 📋 Prerequisites

- ✅ QuadVault running on http://localhost:3000
- ✅ Samba mount accessible at `/media` (your drone footage)
- ✅ NVIDIA GPU recommended (but optional - can use CLIP without GPU)
- ✅ Docker containers running

---

## 🚀 Step-by-Step Workflow

### Step 0: Label Your Videos (10-30 minutes)

**What:** Tell the AI which videos are highlights and which are normal

**How:**
1. Open http://localhost:3000
2. Click **"AI Training 🤖"** in the navigation
3. Go to **Tab 0: Label Videos**
4. Click **"Load Example"** to see the format
5. Replace example paths with YOUR actual video paths:

**Highlights (Your Best Footage):**
- Epic sunsets
- Technical proximity flying
- Smooth cinematic shots
- Action sequences
- Unique perspectives

**Normal (Regular Footage):**
- Takeoffs and landings
- Battery/equipment tests
- Transit footage
- Preflight checks
- Boring/static shots

**Tips:**
- Start with 25-50 videos of each type (50-100 total)
- Use full paths: `/media/2024/folder/video.mp4`
- Click **+ Add Highlight** / **+ Add Normal** to add more
- Click 🗑️ to remove entries

6. Click **"Save Labels & Continue"**
7. ✅ Labels saved to `/media/labels.json`

---

### Step 1: Prepare Training Dataset (5-30 minutes)

**What:** Extract frames from your labeled videos for training

**How:**
1. Stay on AI Training page
2. Go to **Tab 1: Prepare Dataset**
3. Path should show: `/media/labels.json` (auto-filled from Step 0)
4. Click **"Start Dataset Preparation"**

**What Happens:**
- Worker extracts 1 frame per second from each video
- Frames organized into `highlight` and `normal` folders
- Creates `dataset.json` with all frame paths
- Progress updates in real-time

**Watch for:**
- Status: `running` → `complete`
- Total Frames: Should show hundreds/thousands
- Highlights vs Normal count

**Time:** 
- 50 videos (100 total) = ~5-10 minutes
- 200 videos (400 total) = ~15-30 minutes

5. ✅ Wait for green "complete" badge

---

### Step 2: Train Custom Model (1-3 hours) - OPTIONAL

**What:** Train AI to recognize YOUR specific highlight preferences

**Note:** You can skip this and use CLIP in Step 3! Training gives better personalized results.

**Prerequisites:**
```bash
# Install PyTorch in worker container (one-time setup)
docker exec quadvault-worker-dev pip3 install torch torchvision pillow tqdm
```

**How:**
1. Go to **Tab 2: Train Model**
2. Check that dataset is complete (green checkmark)
3. Click **"Start Training"**

**What Happens:**
- Trains ResNet18 neural network on your labeled frames
- Shows live progress: epoch, accuracy, loss
- Saves best model automatically

**Monitor Progress:**
```bash
# Watch training logs (optional)
docker logs quadvault-worker-dev --tail 50 -f
```

**What You'll See:**
- Epoch 1/50: Train Acc 73%, Val Acc 81%
- Epoch 10/50: Train Acc 89%, Val Acc 87%
- Epoch 50/50: Train Acc 95%, Val Acc 93%
- ✅ Model saved to `/tmp/training/model.pth`

**Time:**
- GPU (RTX 3070): 1-2 hours
- GPU (RTX 4090): 30-60 minutes
- CPU: Don't do this (will take days)

4. ✅ Wait for "Training Complete" with accuracy >85%

---

### Step 3: Batch Classify Your Library (12-24 hours overnight)

**What:** Apply AI to scan your entire 9TB library and find highlights

**How:**
1. Go to **Tab 3: Batch Classify**
2. Set **Library Path:** `/media` (or your specific folder)
3. Click **"Start Batch Classification"**

**What Happens:**
- Scans all videos recursively in `/media`
- Extracts sample frames from each video
- Scores using trained model (or CLIP if no model)
- Videos above threshold (0.7) = highlights
- Real-time progress updates

**Live Stats:**
- Videos Processed: 1,234 / 18,432
- Speed: 4.5 videos/sec
- Highlights Found: 247
- ETA: 14h 32m

**Performance Estimates:**

| Your GPU | Speed | 18,000 Videos |
|----------|-------|---------------|
| RTX 4090 | 8-10/sec | 6-8 hours |
| RTX 3070 | 4-6/sec | 12-18 hours |
| RTX 3060 | 2-4/sec | 18-24 hours |
| CPU only | 0.3/sec | Use CLIP instead |

**Run Overnight:**
```bash
# It runs in background - you can close browser
# Check progress anytime by reopening AI Training tab
```

4. ✅ Wake up to completed classification!

---

### Step 4: View Results

**What:** See your top highlights and download results

**How:**
1. Go to **Tab 4: Results**
2. View:
   - Model Accuracy (if trained)
   - Total Highlights Found
   - Top 50 clips with scores
   - Full results in `/tmp/highlights.json`

**Download Results:**
```bash
# Copy highlights.json from container
docker cp quadvault-worker-dev:/tmp/highlights.json ./my-highlights.json

# View in JSON viewer or create highlight reel (coming soon)
```

---

## 🎓 Alternative: Quick Start with CLIP (No Training)

Want to test WITHOUT training? Use CLIP for instant results:

1. Skip Step 0, 1, 2 entirely
2. Go directly to **Tab 3: Batch Classify**
3. Set library path
4. Click **Start Batch Classification**
5. System automatically uses CLIP (no custom model)

**CLIP Benefits:**
- ✅ Works immediately
- ✅ No labeling required
- ✅ Good for general scenes (sunsets, action, landscapes)

**CLIP Limitations:**
- ❌ Doesn't learn YOUR preferences
- ❌ Less accurate for drone-specific patterns
- ❌ Can't distinguish subtle differences

---

## 📊 How to Label Good Examples

### Highlights Should Include:

**Epic Scenery:**
- Golden hour sunsets over water
- Mountain peaks and valleys
- Waterfalls and natural features
- Dramatic weather/clouds

**Technical Skill:**
- Proximity flying through obstacles
- Smooth cinematic movements
- Perfect tracking shots
- Creative angles

**Action:**
- Fast racing through gaps
- Chasing subjects
- Diving/climbing
- Dynamic movement

### Normal Should Include:

- Takeoffs before you reach location
- Landings after flight done
- Battery voltage checks
- Equipment tests
- Boring transit (flying to spot)
- Static hover shots
- Failed/aborted runs

---

## 🔧 Troubleshooting

### "Labels file not found"
- Make sure `/media` is your Samba mount
- Check paths are correct (full path from `/media/...`)
- Save labels in Tab 0 first

### "Dataset preparation failed"
- Check video files exist at labeled paths
- Ensure ffmpeg is working: `docker exec quadvault-worker-dev ffmpeg -version`
- Check worker logs: `docker logs quadvault-worker-dev --tail 50`

### "Training accuracy stuck at 50%"
- Add more diverse examples
- Check labels are consistent
- Try more epochs (increase from 50 to 100)

### "Batch classification very slow"
- Check if GPU is being used: `nvidia-smi`
- Reduce library size for testing
- Try CLIP instead of custom model

### "Out of memory during training"
- Reduce batch size from 32 to 16
- Close other GPU applications
- Use cloud GPU (Google Colab)

---

## 💡 Pro Tips

### Start Small, Scale Up
1. Label 50 videos → Train → Test on 100 videos
2. If good accuracy, label 200 more → Retrain
3. Then process full 9TB library

### Use Multiple Models
Train different models for different footage types:
- `racing-model.pth` for FPV racing
- `cinematic-model.pth` for smooth landscapes
- `proximity-model.pth` for close flying

### Improve Over Time
After processing library:
1. Review some false positives (marked highlight but wasn't)
2. Add those to "normal" labels
3. Retrain model
4. Accuracy improves!

### Batch Process New Footage
After every flight:
1. Upload to `/media/2025/new-footage/`
2. Run batch classify on just that folder
3. Auto-detect highlights from new flights

---

## 📈 What to Expect

### After 50 Videos Labeled
- Training Time: 30 minutes
- Model Accuracy: 75-80%
- Good for: Initial testing

### After 200 Videos Labeled  
- Training Time: 2 hours
- Model Accuracy: 85-90%
- Good for: Production use

### After 500 Videos Labeled
- Training Time: 3-4 hours  
- Model Accuracy: 90-95%
- Good for: Professional curation

---

## 🎬 Next Steps After Results

Once you have `highlights.json`:

1. **Review Top Clips**
   - Open highest scored videos manually
   - Verify AI found the good stuff

2. **Create Highlight Reels** (coming soon)
   - Auto-assemble best clips
   - Add transitions
   - Export for social media

3. **Filter by Score**
   ```bash
   # In highlights.json, filter by score:
   # 0.9+ = Absolute best
   # 0.8-0.9 = Very good
   # 0.7-0.8 = Good
   ```

4. **Share the Model**
   - Your trained model is only ~50MB
   - Share with friends who fly similar spots
   - They get your preferences without labeling!

---

## ✅ Complete Workflow Summary

```
Label Videos (Tab 0)          → 10-30 minutes
     ↓
Prepare Dataset (Tab 1)       → 5-30 minutes  
     ↓
Train Model (Tab 2) OPTIONAL  → 1-3 hours
     ↓
Batch Classify (Tab 3)        → 12-24 hours
     ↓
View Results (Tab 4)          → Your highlights!
```

**Total Time Investment:**
- First time: 2-4 hours active + 12-24 hours overnight
- Future retraining: Just add more labels and retrain
- Ongoing use: Automatic highlight detection forever!

---

## 🆘 Need Help?

- **Worker logs:** `docker logs quadvault-worker-dev --tail 100`
- **App logs:** `docker logs quadvault-dev --tail 100`
- **Status files:** Check `/tmp/*-status.json` in worker container
- **Training guide:** See `worker/TRAINING-GUIDE.md` for details
- **Code:** `worker/aiTrainer.js` and `worker/train_classifier.py`

---

**Ready to start? Open http://localhost:3000 and click AI Training 🤖**
