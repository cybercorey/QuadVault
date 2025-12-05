#!/bin/bash
# Download binaries from GitHub releases for development
# NOTE: This is only needed if you want to run the worker outside Docker.
# For Docker development, binaries are built into the image - DO NOT run this script.

set -e

echo "WARNING: This script downloads binaries to the host for non-Docker development."
echo "For Docker development (recommended), binaries are already in the container image."
echo ""
read -p "Are you sure you want to download binaries to the host? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled. Use Docker images which already contain the binaries."
    exit 0
fi

WORKER_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Downloading mp4_merge binary..."
curl -L -o "$WORKER_DIR/mp4_merge" https://github.com/gyroflow/mp4-merge/releases/latest/download/mp4_merge-linux64
chmod +x "$WORKER_DIR/mp4_merge"
echo "✓ Downloaded mp4_merge ($(du -h "$WORKER_DIR/mp4_merge" | cut -f1))"

echo ""
echo "Downloading gyroflow binary (AppImage with bundled libraries)..."
curl -L -o "$WORKER_DIR/gyroflow.AppImage" https://github.com/gyroflow/gyroflow/releases/latest/download/Gyroflow-linux64.AppImage
chmod +x "$WORKER_DIR/gyroflow.AppImage"
cd "$WORKER_DIR" && ./gyroflow.AppImage --appimage-extract
rm "$WORKER_DIR/gyroflow.AppImage"

# Create wrapper script to run gyroflow with bundled libraries
cat > "$WORKER_DIR/gyroflow" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/squashfs-root"
export LD_LIBRARY_PATH="$SCRIPT_DIR/squashfs-root/lib:$LD_LIBRARY_PATH"
exec ./AppRun "$@"
EOF
chmod +x "$WORKER_DIR/gyroflow"
echo "✓ Downloaded gyroflow with bundled libraries"

echo ""
echo "✓ All binaries downloaded successfully!"
