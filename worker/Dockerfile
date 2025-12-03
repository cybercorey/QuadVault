FROM node:18-bullseye-slim

# Install system dependencies for mounting, file operations, and media processing
RUN apt-get update && apt-get install -y \
    util-linux \
    ntfs-3g \
    exfat-fuse \
    usbutils \
    bash \
    ffmpeg \
    xvfb \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /worker

# Download binaries from GitHub releases
RUN curl -L -o mp4_merge https://github.com/gyroflow/mp4-merge/releases/latest/download/mp4_merge-linux64 && \
    chmod +x mp4_merge

# Note: Gyroflow binary requires Qt6 and FFmpeg 6.1+ which aren't available in Debian Bullseye
# We'll use FFmpeg vid.stab for stabilization instead
# RUN curl -L -o gyroflow.zip https://github.com/gyroflow/gyroflow/releases/download/v1.5.4/Gyroflow-linux64.zip && \
#     unzip gyroflow.zip && \
#     chmod +x gyroflow && \
#     rm gyroflow.zip

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
