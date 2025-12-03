const fs = require('fs-extra');
const path = require('path');

const DEST_ROOT = process.env.DEST_ROOT || '/mnt/network_share';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    // Join all path segments
    const pathSegments = req.query.path;
    if (!pathSegments || !Array.isArray(pathSegments)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    
    const thumbnailPath = path.join(DEST_ROOT, ...pathSegments);
    
    // Security: ensure path is within DEST_ROOT
    const resolvedPath = path.resolve(thumbnailPath);
    const resolvedRoot = path.resolve(DEST_ROOT);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!await fs.pathExists(thumbnailPath)) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    
    // Read and serve the image
    const image = await fs.readFile(thumbnailPath);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(image);
  } catch (error) {
    console.error('[Thumbnail API] Error:', error);
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
}
