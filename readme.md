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
- 🎥 DJI video merging

## 🚀 Quick Start

```bash
git clone https://github.com/cybercorey/QuadVault.git
cd QuadVault
docker compose up -d
# Open http://localhost:3000
```

## 📚 Documentation

Full documentation in the [Wiki](https://github.com/cybercorey/QuadVault/wiki):

- [Installation](https://github.com/cybercorey/QuadVault/wiki/Installation)
- [First Flight](https://github.com/cybercorey/QuadVault/wiki/First-Flight)
- [AI Training](https://github.com/cybercorey/QuadVault/wiki/AI-Training)
- [User Guide](https://github.com/cybercorey/QuadVault/wiki/User-Guide)
- [Advanced Features](https://github.com/cybercorey/QuadVault/wiki/Advanced-Features)
- [API Reference](https://github.com/cybercorey/QuadVault/wiki/API-Reference)
- [Troubleshooting](https://github.com/cybercorey/QuadVault/wiki/Troubleshooting)

## 🤖 AI Assisted Labeling

NEW in v2.0! Train AI on your footage with our assisted labeling tool:

1. Scan your library
2. Watch videos → Press H (highlight) or N (normal)
3. Train custom model
4. Batch process 9TB overnight

See [AI Training Guide](https://github.com/cybercorey/QuadVault/wiki/AI-Training)

## 🛠️ Tech Stack

- **Backend:** Next.js, SQLite, Node.js
- **Frontend:** React 18, Chakra UI, Socket.IO
- **AI:** PyTorch, CLIP, custom CNN models
- **Video:** Gyroflow (stabilization), mp4-merge (DJI files)

## 🙏 Credits

- **[Gyroflow](https://github.com/gyroflow/gyroflow)** - GPU-accelerated video stabilization
- **[mp4-merge](https://github.com/gyroflow/mp4-merge)** - Fast, lossless MP4 merging

## 💬 Support

- 📖 [Wiki](https://github.com/cybercorey/QuadVault/wiki)
- 🐛 [Issues](https://github.com/cybercorey/QuadVault/issues)
- 💭 [Discussions](https://github.com/cybercorey/QuadVault/discussions)

## 📄 License

MIT
