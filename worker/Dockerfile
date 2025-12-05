# GPU-enabled worker build (default)
# Requires NVIDIA GPU and nvidia-docker for video stabilization

FROM nvidia/cuda:12.3.1-runtime-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    GPU_SUPPORT=true \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=all

# Install Node.js 20.x from NodeSource
RUN apt-get update && apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

# Install system dependencies for mounting, file operations, and media processing
RUN apt-get update && apt-get install -y \
    nodejs \
    util-linux \
    ntfs-3g \
    exfat-fuse \
    usbutils \
    bash \
    ffmpeg \
    curl \
    unzip \
    ca-certificates \
    libfuse2 \
    libglib2.0-0 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libgl1 \
    libegl1 \
    libxcb-cursor0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-shape0 \
    libxcb-xfixes0 \
    libxcb-xinerama0 \
    libxcb-xkb1 \
    libxkbcommon-x11-0 \
    libva2 \
    libva-drm2 \
    libvdpau1 \
    ocl-icd-libopencl1 \
    clinfo \
    vulkan-tools \
    mesa-vulkan-drivers \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Configure OpenCL ICD to use NVIDIA
RUN mkdir -p /etc/OpenCL/vendors && \
    echo "libnvidia-opencl.so.1" > /etc/OpenCL/vendors/nvidia.icd

# NVIDIA CUDA libraries are included in the base image
# OpenCL ICD loader will use NVIDIA's implementation

WORKDIR /worker

# Download binaries from GitHub releases
RUN curl -L -o mp4_merge https://github.com/gyroflow/mp4-merge/releases/latest/download/mp4_merge-linux64 && \
    chmod +x mp4_merge

# Download gyroflow AppImage and extract it
RUN curl -L -o gyroflow.AppImage https://github.com/gyroflow/gyroflow/releases/latest/download/Gyroflow-linux64.AppImage && \
    chmod +x gyroflow.AppImage && \
    ./gyroflow.AppImage --appimage-extract && \
    rm gyroflow.AppImage

# Create wrapper script that sets up environment and runs gyroflow
RUN printf '#!/bin/bash\ncd /worker/squashfs-root\nexport LD_LIBRARY_PATH=/worker/squashfs-root/lib:$LD_LIBRARY_PATH\nexec ./AppRun "$@"\n' > /worker/gyroflow && \
    chmod +x /worker/gyroflow

# Copy package files
COPY worker/package*.json ./

# Install dependencies
RUN npm install --production

# Copy worker code
COPY worker/worker.js ./
COPY worker/merger.js ./

# Copy shared libraries from app
RUN mkdir -p /app/lib
COPY app/lib/storage.js /app/lib/

# Binaries are downloaded in earlier step
# No longer copying from app/ directory

# Set NODE_PATH so shared libs can find worker's node_modules
ENV NODE_PATH=/worker/node_modules

# Worker doesn't need to expose ports
CMD ["node", "worker.js"]
