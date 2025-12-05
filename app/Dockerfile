FROM node:18-bullseye AS base

# Install filesystem drivers and utilities
RUN apt-get update && apt-get install -y \
    ntfs-3g \
    exfat-fuse \
    usbutils \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create required directories
RUN mkdir -p /mnt/usb_incoming /mnt/network_share

# Development stage
FROM base AS development
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
COPY package.json .
RUN npm install --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]