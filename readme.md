# 🚀 QuadVault

**Automated USB Offloading for Quadcopter & Drone Footage**

A self-hosted, automated solution for offloading files from USB drives to a Network Attached Storage (SMB/CIFS) share with real-time monitoring via Next.js + React + Chakra UI. Specifically optimized for FPV, DJI, and drone footage with automatic video merging.

## ✨ Features
* **Auto-Detection:** Instantly detects USB insertion via Linux Udev & Systemd.
* **Safe Transfer:** Uses a "Copy → Verify Size → Rename → Delete Source" workflow to prevent data loss if unplugged early.
* **Global Lock:** Prevents multiple jobs from running simultaneously.
* **Whitelist Security:** Only copies from allowed UUIDs.
* **Granular Control:** Supports specific source folders (e.g., `/DCIM`) and manual sync buttons.
* **Modern Web UI:** React dashboard with real-time progress, live logs via Socket.IO, device management, transfer history with pagination.
* **DJI Video Merger:** Automatically merge split DJI video files into single per-flight files using [mp4-merge](https://github.com/gyroflow/mp4-merge).
* **Video Stabilization:** FFmpeg-based stabilization with vid.stab filters for smooth footage.
* **Dry Run Mode:** Test transfers without deleting source files.
* **NTFS Support:** Automatic read-only mount fallback for NTFS drives with filesystem errors.

---

## 🙏 Credits

This project uses the following excellent tools:
* **[mp4-merge](https://github.com/gyroflow/mp4-merge)** - Fast, lossless MP4 file merging by the Gyroflow team
* **[Gyroflow](https://github.com/gyroflow/gyroflow)** - Advanced video stabilization software (binary included for future features)

---

## 🛠️ Tech Stack

### Backend
* **Next.js** (custom server with Socket.IO)
* **SQLite** (better-sqlite3 for job history & storage cache)
* **Node.js** with fs-extra for safe file operations

### Frontend
* **React 18** with Next.js pages
* **Chakra UI** for components and theming
* **Socket.IO client** for real-time updates

---

## 🛠️ Prerequisites

### 1. Host OS
* **Ubuntu 24.04** (or similar Linux).
* **Docker Engine** & **Docker Compose** (v2+).

### 2. Network Share Utilities
The host machine requires CIFS utilities to handle the SMB volume driver.
```bash
sudo apt update && sudo apt install -y cifs-utils
```

---

## ⚙️ Configuration

### 1. Environment Variables (`.env`)
Copy the template file and configure your Network Share credentials:

```bash
cp .env.template .env
nano .env
```

See `.env.template` for all available configuration options including:
* SMB server path, username, and password (required)
* Optional: mount points, port override, and environment settings

### 2. Docker Compose
The included `docker-compose.yml` is pre-configured with:
* **Network Mode:** `host` mode for easy trigger script communication
* **Privileged Mode:** Required for mounting USB devices inside the container
* **Volumes:** Maps `/dev` and `/run/udev` for device detection

---

## 📥 Installation & Host Setup

### Step 1: Configure Environment
Set up your `.env` file as described in the Configuration section above.

### Step 2: Start the Container

**Production (uses pre-built images from GitHub):**
```bash
docker compose -f docker-compose.prod.yml up -d
```

**Development (builds from local source with hot reload):**
```bash
# First-time setup: Download required binaries
./worker/download-binaries.sh

# Start development environment
docker compose -f docker-compose.dev.yml up -d --build
```

Development mode includes:
- Next.js dev server with hot reload
- Source code mounted for live changes
- Full dev dependencies installed
- Binaries downloaded from GitHub releases (not in git repo)

### Step 3: Install Host Triggers (Systemd Method)
The `setup/` directory contains all required system integration files. Install them to enable automatic USB detection:

#### 1. Install the Trigger Script
```bash
sudo cp setup/usb-trigger.sh /usr/local/bin/usb-trigger.sh
sudo chmod +x /usr/local/bin/usb-trigger.sh
```

#### 2. Install the Systemd Service
```bash
sudo cp setup/usb-trigger@.service /etc/systemd/system/usb-trigger@.service
```

#### 3. Install the Udev Rule
```bash
sudo cp setup/99-usb-docker.rules /etc/udev/rules.d/99-usb-docker.rules
```

#### 4. Reload System
Apply the changes:
```bash
sudo systemctl daemon-reload
sudo udevadm control --reload-rules
sudo udevadm trigger
```

---

## 🖥️ Usage Guide

### 1. Access the Dashboard
Open your browser and navigate to:
**http://localhost:3000** (or your server IP:3000)

The React UI provides:
* **Devices:** Add/edit allowed devices, scan for connected drives, enable merger and dry-run modes.
* **History:** View paginated transfer history with job details, files transferred, and logs.
* **Storage:** Check available disk space and trigger background storage computation.
* **Settings:** Edit configuration JSON directly.
* **Live Updates:** Real-time job progress banner and live log viewer.

### 2. Add a Device
1. Navigate to **Devices** page.
2. Click **Add Device** button.
3. Click **Refresh** in the modal to scan for connected drives.
4. Click **Fill** next to your drive to pre-populate fields.
5. (Optional) Enter a **Source Path** (e.g., `/DCIM`) if you only want to copy specific folders.
6. (Optional) Enable **Merger** to merge DJI split video files.
7. (Optional) Enable **Dry Run** to copy without deleting source files.
8. Click **Save**.

### 3. Syncing
* **Automatic:** Unplug the drive and plug it back in (Udev trigger).
* **Manual:** Use the Devices page or POST /api/sync/:uuid to trigger a manual sync.

---

## 📂 Project Structure

```
/your/project/path/quadvault/
├── setup/                      # System integration files
│   ├── usb-trigger.sh         # Copy to /usr/local/bin/
│   ├── usb-trigger@.service   # Copy to /etc/systemd/system/
│   └── 99-usb-docker.rules    # Copy to /etc/udev/rules.d/
├── app/                       # Next.js application (Dockerized)
│   ├── components/            # React UI components
│   ├── lib/                   # Backend logic (jobs, storage, socket)
│   ├── pages/                 # Next.js pages and API routes
│   └── public/                # Static assets
├── worker/                    # Worker container for job processing
├── .env.template              # Environment template (copy to .env)
├── docker-compose.prod.yml    # Production deployment (uses pre-built images)
├── docker-compose.dev.yml     # Development deployment (builds from source)
└── readme.md                  # This file
```

---

## 📂 Troubleshooting

**"Device detected but no UUID"**
* Ensure `docker-compose.yml` has the volume: `- /run/udev:/run/udev:ro`.
* Ensure you are running the container with `privileged: true`.

**"Logs show: Triggered, but nothing happens"**
* Check `/tmp/usb-automator.log` on the host to see if the script ran.
* If the log says "Response: 409", the system is **Busy** (another transfer is running).
* If the log says "Response: 000", the script failed to reach Docker (check if Docker is running on port 3000).

**"Files are .part files"**
* If you see `.part` files on your NAS, the transfer was interrupted. Delete them and try again. The source file on the USB is safe.

**"NTFS mount errors (MFT/MFTMirr mismatch)"**
* The system tries multiple mount strategies automatically:
  1. ntfs-3g with `remove_hiberfile` option (removes Windows hibernation file)
  2. ntfs-3g read-only mode
  3. Standard read-only with `noload` option
  4. Basic read-only mount
* If mounted read-only, dry-run mode is automatically enabled (copy without delete).
* If all mount attempts fail, the drive requires Windows repair:
  - Boot into Windows and run `chkdsk /f X:` (replace X with drive letter)
  - Reboot Windows twice to complete the repair
  - Or access files directly from Windows to copy manually
* Check logs for specific mount strategy used and any error details.