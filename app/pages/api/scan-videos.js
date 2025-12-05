const fs = require('fs-extra');
const path = require('path');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path: scanPath = '/media', limit = 100 } = req.query;

    // Find video files
    const videos = await findVideos(scanPath, parseInt(limit));

    return res.json({
      success: true,
      videos,
      total: videos.length
    });

  } catch (err) {
    console.error('[Scan Videos] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function findVideos(dir, limit) {
  const videos = [];
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.m4v'];
  
  async function scan(currentDir, depth = 0) {
    if (videos.length >= limit || depth > 5) return; // Stop if limit reached or too deep
    
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      // First collect all video files in this directory
      const videoFiles = [];
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (videoExts.includes(ext)) {
            videoFiles.push(entry);
          }
        }
      }
      
      // Shuffle and add random videos from this folder
      const shuffled = videoFiles.sort(() => Math.random() - 0.5);
      for (const entry of shuffled) {
        if (videos.length >= limit) break;
        
        const fullPath = path.join(currentDir, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          videos.push({
            path: fullPath,
            name: entry.name,
            folder: path.basename(currentDir),
            size: stats.size,
            thumbnailUrl: `/api/thumbnail/${encodeURIComponent(fullPath)}`
          });
        } catch (err) {
          // Skip if can't stat
        }
      }
      
      // Then scan subdirectories
      if (videos.length < limit) {
        const dirs = entries.filter(e => e.isDirectory());
        for (const entry of dirs) {
          if (videos.length >= limit) break;
          const fullPath = path.join(currentDir, entry.name);
          await scan(fullPath, depth + 1);
        }
      }
    } catch (err) {
      console.error(`Error scanning ${currentDir}:`, err.message);
    }
  }
  
  await scan(dir);
  
  // Shuffle final results for variety
  return videos.sort(() => Math.random() - 0.5);
}
