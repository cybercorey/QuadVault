# GitHub Setup for QuadVault

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `quadvault` (or your preference)
3. Choose **Public** (free unlimited Actions) or **Private** (2000 free minutes/month)
4. **DO NOT** initialize with README (we already have one)
5. Click **Create repository**

## Step 2: Add Remote and Push

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/quadvault.git

# Verify remote
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Container Registry

The workflow is already configured to use GitHub Container Registry (GHCR).

**No additional setup needed!** The workflow uses `GITHUB_TOKEN` which is automatically provided.

## Step 4: Create a Release (Triggers Docker Build)

### Option A: Create a Tag Locally
```bash
# Create and push a version tag
git tag v1.4.0
git push origin v1.4.0
```

### Option B: Create Release on GitHub
1. Go to your repository on GitHub
2. Click **Releases** → **Create a new release**
3. Click **Choose a tag** → Type `v1.4.0` → **Create new tag**
4. Title: `QuadVault v1.4.0`
5. Description: Add release notes
6. Click **Publish release**

## What Happens Automatically

When you push a tag (e.g., `v1.4.0`):

✅ **Builds two Docker images:**
- `ghcr.io/YOUR_USERNAME/quadvault:latest`
- `ghcr.io/YOUR_USERNAME/quadvault:1.4.0`
- `ghcr.io/YOUR_USERNAME/quadvault-worker:latest`
- `ghcr.io/YOUR_USERNAME/quadvault-worker:1.4.0`

✅ **Multi-architecture support:**
- `linux/amd64` (Intel/AMD)
- `linux/arm64` (Raspberry Pi, Apple Silicon)

✅ **Published to GitHub Packages:**
- Visible at `https://github.com/YOUR_USERNAME/quadvault/pkgs/container/quadvault`

## Using the Published Images

Update your `docker-compose.yml` to use published images:

```yaml
services:
  quadvault:
    image: ghcr.io/YOUR_USERNAME/quadvault:latest
    # Remove: build: ./app
    
  worker:
    image: ghcr.io/YOUR_USERNAME/quadvault-worker:latest
    # Remove: build: context/dockerfile
```

## Making Images Public

By default, packages are private. To make them public:

1. Go to https://github.com/YOUR_USERNAME?tab=packages
2. Click on `quadvault`
3. Click **Package settings**
4. Scroll to **Danger Zone**
5. Click **Change visibility** → **Public**
6. Repeat for `quadvault-worker`

## Troubleshooting

**Build fails with permission error:**
- Ensure your repository has Actions enabled
- Check Settings → Actions → General → Workflow permissions → "Read and write permissions"

**Images not appearing:**
- Wait 5-10 minutes for first build
- Check Actions tab for build progress
- Look for any error messages

**Need to use Docker Hub instead?**
- Add Docker Hub credentials as GitHub Secrets
- Update workflow to use Docker Hub registry
- See: https://docs.docker.com/ci-cd/github-actions/
