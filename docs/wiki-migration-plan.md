# GitHub Wiki Migration - Ready to Execute

## ✅ Current Status

The feature/ai-auto-train branch has:
- Complete AI training system with CLIP + custom models
- **NEW**: Assisted labeling with video preview
- Dark theme throughout
- All documentation written
- 11 commits ready to merge

**Time to move docs to GitHub Wiki!**

---

## 📚 Wiki Pages to Create

### 1. Home.md
```markdown
# Welcome to QuadVault

**Automated FPV/Drone footage management with AI-powered highlight detection**

## 🚀 Quick Start
- [Installation](Installation)
- [First Flight](First-Flight) 
- [AI Training](AI-Training)

## 📖 Documentation
- [User Guide](User-Guide)
- [AI Auto-Highlights](AI-Training)
- [Advanced Features](Advanced-Features)
- [API Reference](API-Reference)

## 🎯 What's New in v2.0
**Assisted Labeling** - Point, click, label. AI learns your style in minutes!
```

### 2. Installation.md
**Content from:** readme.md (Docker setup section)

```markdown
# Installation

## Prerequisites
- Docker & Docker Compose
- NVIDIA GPU (optional, for AI training)
- USB storage for footage

## Quick Install
\`\`\`bash
git clone https://github.com/cybercorey/QuadVault.git
cd QuadVault
docker compose up -d
\`\`\`

Open http://localhost:3000

## Next Steps
- [First Flight](First-Flight) - Connect your first device
- [AI Training](AI-Training) - Train AI on your footage
```

### 3. AI-Training.md
**Content from:** QUICKSTART.md + new assisted labeling

```markdown
# AI Auto-Highlight Training

Train AI to automatically detect your best footage!

## ✨ Assisted Labeling (Easiest Way)

1. Click **AI Training 🤖** in navigation
2. **Tab 0: Label Videos**
3. Click **"Start Scanning Videos"**
4. Watch video → Press **H** (highlight) or **N** (normal)
5. Repeat for 50-100 videos
6. Click **"Save Labels & Continue"**

### Keyboard Shortcuts
- `H` - Mark as Highlight
- `N` or `Space` - Mark as Normal
- `S` - Skip without labeling

### Tips
- Start with 50 videos (quick test)
- Label 200+ for production quality
- Videos are shown randomly for variety
- Can save and continue anytime

## 📊 Training Steps

### Step 1: Prepare Dataset (5-30 min)
Extracts frames from your labeled videos

### Step 2: Train Model (1-3 hours, optional)
Learns YOUR specific preferences
- Requires: `docker exec quadvault-worker-dev pip3 install torch torchvision pillow tqdm`
- GPU recommended

### Step 3: Batch Classify (overnight)
Scans entire library, finds all highlights

### Step 4: Results
View top clips, download highlights.json

## 🎯 Alternative: CLIP (No Training)

Skip Steps 1-2, go straight to Batch Classify.
Uses pre-trained AI - works immediately!

## Performance

| GPU | Speed | 18k videos |
|-----|-------|------------|
| RTX 4090 | 8-10/sec | 6-8 hours |
| RTX 3070 | 4-6/sec | 12-18 hours |

See [Advanced Training](AI-Training-Advanced) for details.
```

### 4. User-Guide.md
**Content from:** Current readme.md features section

```markdown
# User Guide

## Connecting Devices

1. Plug in USB drive
2. QuadVault auto-detects
3. View in **Dashboard**

## Syncing Footage

### Manual Sync
- Dashboard → Device → **Sync**
- Copies all videos to `/media`

### Auto-trigger (udev)
- See [USB Auto-trigger](USB-Auto-trigger)
- Syncs automatically on connect

## Managing Storage

**Storage** tab shows:
- Total files and size
- Analytics charts  
- Duplicate detection
- Refresh button

## Viewing History

**History** tab shows:
- All past sync jobs
- Status and progress
- Error logs

## Advanced Features

See [Advanced Features](Advanced-Features) for:
- Parallel processing
- Incremental sync
- Flight paths
- AI scene detection
```

### 5. Advanced-Features.md
**Content from:** Advanced settings documentation

```markdown
# Advanced Features

Enable in **Settings → Advanced Features**

## Multi-Device Parallel Processing
- Process multiple devices simultaneously
- Configure max concurrent devices
- Worker auto-scales

## Storage Analytics
- File type breakdown
- Size distribution
- Duplicate detection
- Visual charts

## Incremental Sync
- Hash-based file comparison
- Skip already-copied files
- Faster repeat syncs

## AI Scene Detection
- Frame extraction
- CLIP or custom model
- Highlight generation

## Flight Path 3D
- Parse DJI SRT telemetry
- Generate GeoJSON
- 3D visualization (coming soon)

See individual guides for details.
```

### 6. API-Reference.md

```markdown
# API Reference

## Device Endpoints

### GET /api/capabilities
Returns detected USB devices

### POST /api/scan
Trigger device scan

### POST /api/sync/:uuid
Start sync job

### POST /api/merge/:uuid
Merge videos

### POST /api/stabilize/:uuid
Stabilize with Gyroflow

## AI Endpoints

### POST /api/ai-prepare-dataset
Prepare training dataset

### POST /api/ai-start-training
Start model training

### POST /api/ai-batch-classify
Batch classify library

### GET /api/ai-training-status
Get training progress

### GET /api/scan-videos
Scan library for labeling

### POST /api/ai-save-labels
Save label file

### GET /api/ai-load-labels
Load existing labels

## WebSocket Events

### `job:progress`
Job progress updates

### `job:complete`
Job completion

### `job:failed`
Job errors
```

### 7. Troubleshooting.md

```markdown
# Troubleshooting

## AI Training Issues

### "No videos found"
- Check `/media` mount point
- Verify files exist
- Check permissions

### "Training very slow"
- Check GPU usage: `nvidia-smi`
- Install CUDA drivers
- Use smaller batch size

### "Out of memory"
- Reduce batch size (32 → 16)
- Close other GPU apps
- Use cloud GPU (Colab)

## General Issues

### Container won't start
\`\`\`bash
docker logs quadvault-dev
docker logs quadvault-worker-dev
\`\`\`

### Videos not syncing
- Check USB device mounted
- Check worker logs
- Verify ffmpeg installed

### UI not loading
- Check port 3000 available
- Restart containers
- Check browser console
```

---

## 🚀 Implementation Steps

### Week 1: Create Wiki Structure

```bash
# Enable wiki in repo settings
# Clone wiki
git clone https://github.com/cybercorey/QuadVault.wiki.git
cd QuadVault.wiki

# Create pages
touch Home.md Installation.md AI-Training.md User-Guide.md
touch Advanced-Features.md API-Reference.md Troubleshooting.md
touch Development.md Contributing.md

# Write content (copy from plan above)
# Commit and push
git add .
git commit -m "Initial wiki structure"
git push
```

### Week 2: Migrate Content

1. Copy from QUICKSTART.md → AI-Training.md
2. Copy from readme.md → Installation.md + User-Guide.md
3. Create new Advanced-Features.md
4. Create API-Reference.md from code
5. Review and polish

### Week 3: Update Main Repo

Create new slim README.md:

```markdown
# QuadVault

**Automated drone footage management with AI-powered highlight detection**

[![Docker](https://img.shields.io/badge/docker-ready-blue)]()
[![AI](https://img.shields.io/badge/AI-powered-purple)]()

## 🎯 Features

- 🔌 Auto-detect USB devices
- 🤖 AI auto-highlight detection  
- 📊 Storage analytics
- 🎬 Video stabilization (Gyroflow)
- 🗺️ Flight path visualization

## 🚀 Quick Start

\`\`\`bash
git clone https://github.com/cybercorey/QuadVault.git
cd QuadVault
docker compose up -d
# Open http://localhost:3000
\`\`\`

## 📚 Documentation

Full documentation in the [Wiki](https://github.com/cybercorey/QuadVault/wiki):

- [Installation](https://github.com/cybercorey/QuadVault/wiki/Installation)
- [AI Training](https://github.com/cybercorey/QuadVault/wiki/AI-Training)
- [User Guide](https://github.com/cybercorey/QuadVault/wiki/User-Guide)
- [API Reference](https://github.com/cybercorey/QuadVault/wiki/API-Reference)

## 🤖 AI Assisted Labeling

NEW in v2.0! Train AI on your footage with our assisted labeling tool:

1. Scan your library
2. Watch videos → Press H (highlight) or N (normal)  
3. Train custom model
4. Batch process 9TB overnight

See [AI Training Guide](https://github.com/cybercorey/QuadVault/wiki/AI-Training)

## 💬 Support

- 📖 [Wiki](https://github.com/cybercorey/QuadVault/wiki)
- 🐛 [Issues](https://github.com/cybercorey/QuadVault/issues)
- 💭 [Discussions](https://github.com/cybercorey/QuadVault/discussions)

## 📄 License

MIT
\`\`\`

### Week 4: Archive Old Docs

Move to `docs/archive/`:
- old-readme.md
- AI-QUICKSTART.md  
- AI-FEATURE-SUMMARY.md
- TRAINING-GUIDE.md

Keep in root:
- README.md (new slim version)
- QUICKSTART.md (quick reference)
- LICENSE
- CONTRIBUTING.md

---

## ✅ Benefits

**Before:**
- 5 large markdown files in root
- Hard to navigate
- Duplicate info
- No search

**After:**
- Clean focused README
- Organized wiki with search
- Easy to update individual topics
- Community can contribute
- Professional appearance

---

## 📝 Next Actions

1. **Enable Wiki** in repo settings
2. **Create initial pages** from templates above
3. **Migrate content** from existing docs
4. **Update README** to new slim version
5. **Archive old files**
6. **Announce** in README and discussions

**Ready to execute?** The content is written, just needs to be moved to wiki pages!
