#!/bin/bash
# Download binaries from GitHub releases for development

set -e

WORKER_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Downloading mp4_merge binary..."
curl -L -o "$WORKER_DIR/mp4_merge" https://github.com/gyroflow/mp4-merge/releases/latest/download/mp4_merge-linux64
chmod +x "$WORKER_DIR/mp4_merge"
echo "✓ Downloaded mp4_merge ($(du -h "$WORKER_DIR/mp4_merge" | cut -f1))"

echo ""
echo "Note: Gyroflow binary requires Qt6 and FFmpeg 6.1+ which aren't available in Debian Bullseye"
echo "Using FFmpeg vid.stab for video stabilization instead"
echo ""
echo "✓ All binaries downloaded successfully!"
