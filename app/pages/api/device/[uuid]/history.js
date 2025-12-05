const fs = require('fs-extra');
const path = require('path');

const CONFIG_FILE = '/app/config.json';
const DEST_ROOT = process.env.DEST_ROOT || '/mnt/network_share';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { uuid } = req.query;
  
  try {
    // Get device config
    const configData = await fs.readJson(CONFIG_FILE);
    const device = configData.devices.find(d => d.uuid === uuid);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const devicePath = path.join(DEST_ROOT, device.outputPath);
    
    // Check if device path exists
    if (!await fs.pathExists(devicePath)) {
      return res.json({ folders: [] });
    }
    
    const entries = await fs.readdir(devicePath, { withFileTypes: true });
    
    // Filter to dated folders (format: YYYY-MM-DD_HH-MM-SS)
    const dateFolderRegex = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
    const dateFolders = entries.filter(e => 
      e.isDirectory() && dateFolderRegex.test(e.name)
    );
    
    const folders = await Promise.all(dateFolders.map(async (entry) => {
      const folderPath = path.join(devicePath, entry.name);
      const outputPath = path.join(folderPath, 'output');
      
      try {
        // Get all files in the folder
        const files = await fs.readdir(folderPath);
        
        // Get MP4 files
        const mp4Files = files.filter(f => f.toLowerCase().endsWith('.mp4'));
        
        // Get thumbnails
        const thumbFiles = files.filter(f => f.endsWith('_thumb.jpg'));
        const thumbnails = thumbFiles.slice(0, 4).map(t => 
          `/api/thumbnail/${encodeURIComponent(path.join(device.outputPath, entry.name, t))}`
        );
        
        // Check if merged/stabilized
        let hasMerged = false;
        let hasStabilized = false;
        
        if (await fs.pathExists(outputPath)) {
          const outputFiles = await fs.readdir(outputPath);
          const outputMp4s = outputFiles.filter(f => f.toLowerCase().endsWith('.mp4'));
          
          // Has merged files if there are MP4s in output without _stab
          hasMerged = outputMp4s.some(f => !f.includes('_stab'));
          
          // Has stabilized files if there are MP4s with _stab
          hasStabilized = outputMp4s.some(f => f.includes('_stab.mp4'));
        }
        
        // Calculate total size of MP4 files
        let totalSize = 0;
        for (const file of mp4Files) {
          try {
            const stats = await fs.stat(path.join(folderPath, file));
            totalSize += stats.size;
          } catch (err) {
            // Skip files that can't be read
          }
        }
        
        return {
          name: entry.name,
          fileCount: mp4Files.length,
          totalSize,
          thumbnails,
          hasMerged,
          hasStabilized
        };
      } catch (err) {
        console.error(`Error processing folder ${entry.name}:`, err.message);
        return null;
      }
    }));
    
    // Filter out null entries and sort by date descending
    const validFolders = folders.filter(f => f !== null);
    validFolders.sort((a, b) => b.name.localeCompare(a.name));
    
    res.json({ folders: validFolders });
  } catch (err) {
    console.error('History API error:', err);
    res.status(500).json({ error: err.message || 'Failed to load history' });
  }
}
