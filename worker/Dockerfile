FROM node:18-alpine

# Install system dependencies for mounting and file operations
RUN apk add --no-cache \
    util-linux \
    ntfs-3g \
    bash

WORKDIR /worker

# Copy package files
COPY worker/package*.json ./

# Install dependencies
RUN npm install --production

# Copy worker code
COPY worker/worker.js ./

# Copy binaries from app directory
COPY app/mp4_merge ./mp4_merge
COPY app/gyroflow ./gyroflow

# Make binaries executable
RUN chmod +x ./mp4_merge ./gyroflow

# Set NODE_PATH so shared libs can find worker's node_modules
ENV NODE_PATH=/worker/node_modules

# Worker doesn't need to expose ports
CMD ["node", "worker.js"]
