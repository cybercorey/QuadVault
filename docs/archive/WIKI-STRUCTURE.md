# QuadVault Wiki Structure

The readme.md has grown large. Here's the proposed GitHub Wiki structure to organize documentation:

## Suggested Wiki Pages

### Home
- Quick overview of QuadVault
- Key features at a glance
- Screenshots
- Quick links to important pages

### Getting Started
- Prerequisites
- Installation
- First-time setup
- Basic configuration

### Features Overview
- Auto-detect USB devices
- Sync, merge, stabilize workflows
- Storage management
- AI auto-highlights
- Advanced features

### User Guide

#### Basic Usage
- Connecting USB devices
- Syncing footage
- Viewing history
- Managing storage

#### Advanced Features
- Multi-device parallel processing
- Storage analytics
- Incremental sync
- Flight path visualization
- AI scene detection

### AI Training Guide
- **Content from:** QUICKSTART.md
- Step-by-step labeling
- Training custom models
- Batch classification
- Using CLIP vs custom models

### API Reference
- REST API endpoints
- WebSocket events
- Configuration options
- Advanced settings API

### Development

#### Architecture
- Docker containers
- Worker queue system
- Frontend (Next.js + Chakra UI)
- Backend (Node.js + Bull)

#### Contributing
- Development setup
- Code style
- Testing
- Pull request process

### Deployment

#### Docker Compose
- Development mode
- Production mode
- Environment variables

#### USB Auto-trigger
- udev rules setup
- systemd service
- Troubleshooting

### Troubleshooting
- Common issues
- Log locations
- Debug mode
- Performance tuning

### FAQ
- Common questions
- Best practices
- Tips and tricks

---

## Migration Steps

### 1. Create GitHub Wiki
```bash
# In your repo settings, enable Wiki
# Clone wiki repo
git clone https://github.com/cybercorey/QuadVault.wiki.git

# Create pages as markdown files
```

### 2. Content to Move

**From current readme.md:**
- Installation → Getting Started
- Features → Features Overview
- Docker setup → Deployment/Docker Compose
- udev rules → Deployment/USB Auto-trigger

**From new docs:**
- AI-QUICKSTART.md → AI Training Guide
- AI-FEATURE-SUMMARY.md → Features Overview/AI
- TRAINING-GUIDE.md → AI Training Guide (Advanced)
- BRANCHES.md → Development/Branches

### 3. New Slim README

Keep in main repo:
```markdown
# QuadVault

**Automated FPV/Drone footage management with AI-powered highlight detection**

[Features](#features) • [Quick Start](#quick-start) • [Documentation](wiki) • [AI Training](wiki/AI-Training-Guide)

## Quick Start

\`\`\`bash
git clone https://github.com/cybercorey/QuadVault.git
cd QuadVault
docker compose up -d
# Open http://localhost:3000
\`\`\`

## Features

- 🔌 Auto-detect USB devices
- 📁 Smart sync, merge, stabilize
- 🤖 AI auto-highlight detection
- 📊 Storage analytics
- 🗺️ Flight path visualization

## Documentation

See the [Wiki](https://github.com/cybercorey/QuadVault/wiki) for full documentation.

## License

MIT
```

### 4. Wiki Homepage Content

```markdown
# Welcome to QuadVault

QuadVault is an automated drone footage management system with AI-powered highlight detection.

## 🚀 Quick Links

- **[Getting Started](Getting-Started)** - Installation and setup
- **[AI Training Guide](AI-Training-Guide)** - Train AI on your footage
- **[User Guide](User-Guide)** - How to use all features
- **[Troubleshooting](Troubleshooting)** - Common issues and solutions

## 📚 Documentation Sections

### For Users
- [Getting Started](Getting-Started)
- [Features Overview](Features-Overview)
- [User Guide](User-Guide)
- [AI Training](AI-Training-Guide)
- [FAQ](FAQ)

### For Developers
- [Architecture](Architecture)
- [API Reference](API-Reference)
- [Contributing](Contributing)
- [Development Setup](Development-Setup)

### For Deployment
- [Docker Setup](Docker-Setup)
- [USB Auto-trigger](USB-Auto-trigger)
- [Production Deployment](Production-Deployment)

## 🎯 What's New

**AI Auto-Highlight Training (v2.0)**
- Label videos in UI
- Train custom models
- Batch classify 9TB libraries
- See [AI Training Guide](AI-Training-Guide)

## 💬 Support

- Issues: [GitHub Issues](https://github.com/cybercorey/QuadVault/issues)
- Discussions: [GitHub Discussions](https://github.com/cybercorey/QuadVault/discussions)
```

---

## Benefits of Wiki Structure

✅ **Better Organization**
- Each topic has dedicated page
- Easy to find information
- Logical navigation

✅ **Easier Maintenance**
- Edit individual pages
- Track changes per topic
- Community can contribute

✅ **Better for Users**
- Searchable
- Table of contents
- Cross-linking between topics

✅ **Cleaner Repo**
- Small focused README
- Docs in wiki
- Code stays prominent

---

## Implementation

### Option 1: Full Migration (Recommended)
1. Create all wiki pages
2. Move content from readme
3. Update readme to slim version
4. Add navigation links

### Option 2: Hybrid
1. Keep readme.md for basics
2. Move advanced docs to wiki
3. Link from readme to wiki

### Option 3: Gradual
1. Start with new AI docs in wiki
2. Migrate old docs over time
3. Keep readme until wiki complete

---

## Files to Archive

Once wiki is complete, these can be archived or moved:

```
readme.md → Wiki/Getting-Started + Wiki/Features
AI-QUICKSTART.md → Wiki/AI-Training-Guide  
AI-FEATURE-SUMMARY.md → Wiki/Features-Overview
TRAINING-GUIDE.md → Wiki/AI-Training-Advanced
BRANCHES.md → Wiki/Development-Branches
```

Keep in repo:
```
README.md (new slim version)
LICENSE
CONTRIBUTING.md
.github/workflows/
```

---

**Next Steps:**
1. Review proposed wiki structure
2. Enable wiki in repo settings
3. Create initial wiki pages
4. Migrate content
5. Update main README with wiki links
