# AI Auto-Highlight Quick Start Guide

## 🚀 Get Started in 3 Steps

You asked: *"What AI's can i use to do the auto highlights, i need to know if i can use the 9TB of footage i have from the last 2 years to train a model, or automatically highlight them using local compute"*

**Answer:** Both! You can use pre-trained CLIP for immediate results, OR train a custom model on your 9TB for personalized highlights.

---

## Option 1: Immediate Start (CLIP - No Training Required)

**Best for:** Quick testing, general scene understanding

CLIP is a pre-trained AI that understands scenes without any training. It runs locally on your hardware.

### Step 1: Rebuild Worker Container

```bash
cd /home/corey/projects/usb-automator
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml build worker --no-cache
docker compose -f docker-compose.dev.yml up -d
```

This installs:
- `@xenova/transformers` - CLIP model runtime (~350MB download on first use)
- `sharp` - Image processing

### Step 2: Enable AI Scene Detection in UI

1. Open http://localhost:3000
2. Navigate to **Settings** → **Advanced Features**
3. Expand **AI Scene Detection**
4. Toggle **Enabled**
5. Set **Provider** to **Local** (uses CLIP)
6. Set **Frame Interval** to 2-3 seconds
7. Click **Save Settings**

### Step 3: Test on a Video

Sync a device with AI scene detection enabled. The system will:
- Extract frames every 2 seconds
- Score each frame for: sunset, action, landscape, smooth_flight, proximity
- Generate clips above threshold score
- Save results to device history

**Check logs:**
```bash
docker logs quadvault-worker-dev --tail 50
```

You should see:
```
[AI Scene] Loading CLIP model (first run downloads ~350MB)...
[AI Scene] CLIP model loaded successfully
[AI Scene] Analyzing frame 1/234...
[AI Scene] Scene detected: sunset=0.87, action=0.23, landscape=0.91
```

---

## Option 2: Train Custom Model on Your 9TB

**Best for:** Personalized highlights matching YOUR preferences

This learns what YOU consider highlight-worthy by training on examples you label.

### Step 1: Label 50-100 Clips

Create `/tmp/labels.json`:

```json
{
  "highlights": [
    "/media/drone-footage/2024/best_sunset.mp4",
    "/media/drone-footage/2023/epic_proximity.mp4",
    "/media/drone-footage/2024/waterfall_dive.mp4"
  ],
  "normal": [
    "/media/drone-footage/2024/takeoff_boring.mp4",
    "/media/drone-footage/2023/battery_test.mp4",
    "/media/drone-footage/2024/transit_footage.mp4"
  ]
}
```

**How many to label?**
- Minimum: 50 of each (100 total) - Quick test
- Recommended: 200 of each (400 total) - Good accuracy
- Best: 500 of each (1000 total) - Production quality

### Step 2: Prepare Training Dataset

```bash
docker exec -it quadvault-worker-dev bash
node aiTrainer.js prepare-dataset /tmp/labels.json /tmp/training
```

Extracts frames and creates dataset.json.

### Step 3: Train Model

**If you have NVIDIA GPU (RTX 3060+):**

```bash
# Inside worker container
pip3 install torch torchvision pillow tqdm
python3 train_classifier.py /tmp/training/dataset.json --epochs 50
```

Training takes 1-3 hours on GPU. Model saved to `/tmp/training/model.pth`.

**If you DON'T have GPU:**

Use Google Colab (free GPU):
1. Upload dataset to Google Drive
2. Open https://colab.research.google.com
3. Copy training script from `worker/train_classifier.py`
4. Run training in Colab
5. Download `model.pth`

### Step 4: Batch Process 9TB Library

```bash
docker exec -it quadvault-worker-dev bash
node aiTrainer.js batch-classify \
  /media/drone-footage \
  /tmp/training/model.pth \
  /tmp/highlights.json
```

**Estimates for 9TB (~18,000 videos):**
- RTX 4090: 6-8 hours
- RTX 3070: 12-18 hours  
- RTX 3060: 18-24 hours

Run overnight, wake up to `highlights.json` with all your best clips scored!

---

## 📊 Comparison: CLIP vs Custom Model

| Feature | CLIP (Pre-trained) | Custom Model |
|---------|-------------------|--------------|
| **Setup time** | 5 minutes | 2-4 hours |
| **Training required** | None | Yes (1-3 hours) |
| **Accuracy** | Good for general scenes | Excellent for YOUR preferences |
| **Understands** | Common concepts (sunset, action, etc.) | What YOU like specifically |
| **Use case** | Quick testing, general highlights | Production use, personalized |
| **Cost** | Free, local | Free, local (if you have GPU) |

**Recommendation:**
1. Start with CLIP to test the system
2. If you like the results → use it!
3. If you want better personalization → train custom model

---

## 🎯 What Each Approach Does

### CLIP Approach (Option 1)
```
Video → Extract frames → CLIP scores each frame → Highlights above threshold
```

**Strengths:**
- Works immediately
- No labeling required
- Understands natural language ("beautiful sunset")
- Good for general scenes

**Limitations:**
- Can't learn your specific preferences
- May miss subtle patterns you care about
- General-purpose, not drone-specific

### Custom Model (Option 2)
```
Your labeled clips → Train model → Model learns YOUR preferences → Apply to 9TB
```

**Strengths:**
- Learns what YOU specifically like
- Can detect subtle patterns
- Gets better as you add more examples
- Drone-specific understanding

**Limitations:**
- Requires labeling examples (2-4 hours)
- Needs GPU for fast training
- Initial setup is more complex

---

## 💰 Cost Analysis

**Cloud AI (Not Recommended):**
- OpenAI Vision API: $0.01 per frame
- 9TB = ~18,000 videos × 100 frames = 1.8M frames
- Cost: **$18,000** 😱

**Local AI (What We Built):**
- CLIP: Free, runs on CPU/GPU
- Custom training: Free (uses your GPU)
- Batch processing: Free (overnight job)
- Total cost: **$0** ✅

Your hardware can handle this!

---

## 🔧 Hardware Requirements

**Minimum (CPU Only):**
- Works but slow (testing only)
- CLIP inference: ~10 seconds per frame
- Not recommended for 9TB

**Recommended (GPU):**
- NVIDIA GPU with 8GB+ VRAM
- RTX 3060, 3070, 4060, 4070, etc.
- CLIP inference: ~0.1 seconds per frame
- Your Docker already has GPU support!

**Check your GPU:**
```bash
nvidia-smi
```

---

## 📚 Full Documentation

- **Quick testing:** This file
- **Detailed training guide:** `worker/TRAINING-GUIDE.md`
- **Code reference:** `worker/aiSceneDetector.js`, `worker/aiTrainer.js`

---

## 🎬 Next Steps

**Start with CLIP (5 minutes):**
```bash
# Rebuild worker
docker compose -f docker-compose.dev.yml build worker --no-cache
docker compose -f docker-compose.dev.yml up -d

# Enable in UI: Settings → Advanced Features → AI Scene Detection
# Set provider to "Local"
# Sync a device and check logs
```

**Then train custom model (if you want better results):**
1. Read `worker/TRAINING-GUIDE.md`
2. Label 50-100 clips
3. Run training
4. Batch process 9TB

**Questions?**
- Check `worker/TRAINING-GUIDE.md` for detailed walkthrough
- Logs: `docker logs quadvault-worker-dev`
- Test training guide: `docker exec quadvault-worker-dev node aiTrainer.js guide`

---

## ✅ Summary

✨ **You can now:**
1. Use CLIP for immediate AI-powered highlights (no training)
2. Train custom model on your 9TB for personalized highlights
3. Batch process entire library overnight with local compute
4. Zero cloud costs - everything runs on your hardware

The system is ready! Start with CLIP to see it in action, then train custom if you want it personalized to your style.
