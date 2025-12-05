const fs = require('fs-extra');
const path = require('path');
const { getAdvancedSettings } = require('../../lib/advancedSettings');

const DEST_ROOT = process.env.DEST_ROOT || '/mnt/network_share';
const TELEMETRY_DB = '/app/telemetry-cache.json';

export default async function handler(req, res) {
  const { uuid, folder } = req.query;
  
  if (!uuid || !folder) {
    return res.status(400).json({ error: 'Missing uuid or folder' });
  }
  
  try {
    const settings = await getAdvancedSettings();
    
    if (!settings.flight_path_3d?.enabled) {
      return res.json({ enabled: false, flightPaths: [] });
    }
    
    // Load device config
    const configData = await fs.readJson('/app/config.json');
    const device = configData.devices.find(d => d.uuid === uuid);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const folderPath = path.join(DEST_ROOT, device.outputPath, folder);
    
    if (!await fs.pathExists(folderPath)) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Check cache first
    let cache = {};
    if (await fs.pathExists(TELEMETRY_DB)) {
      cache = await fs.readJson(TELEMETRY_DB);
    }
    
    const cacheKey = `${uuid}:${folder}`;
    if (cache[cacheKey] && cache[cacheKey].timestamp > Date.now() - 24 * 60 * 60 * 1000) {
      // Return cached data if less than 24 hours old
      return res.json({
        enabled: true,
        settings: settings.flight_path_3d,
        flightPaths: cache[cacheKey].data
      });
    }
    
    // Scan folder for telemetry files
    const files = await fs.readdir(folderPath);
    const srtFiles = files.filter(f => f.toLowerCase().endsWith('.srt'));
    
    const flightPaths = [];
    
    for (const srtFile of srtFiles) {
      const srtPath = path.join(folderPath, srtFile);
      const videoName = srtFile.replace(/\.srt$/i, '.MP4');
      
      try {
        // Parse SRT file (simplified - would use telemetryParser in production)
        const content = await fs.readFile(srtPath, 'utf8');
        const entries = content.split('\n\n');
        const points = [];
        
        for (const entry of entries) {
          const lines = entry.trim().split('\n');
          if (lines.length < 3) continue;
          
          const dataLine = lines.slice(2).join(' ');
          const latMatch = dataLine.match(/GPS\s*\(([^,]+),\s*([^,]+)/i);
          
          if (latMatch) {
            const lat = parseFloat(latMatch[1]);
            const lon = parseFloat(latMatch[2]);
            
            if (!isNaN(lat) && !isNaN(lon)) {
              points.push([lon, lat]); // GeoJSON format: [lng, lat]
            }
          }
        }
        
        if (points.length > 0) {
          flightPaths.push({
            video: videoName,
            points,
            center: points[Math.floor(points.length / 2)]
          });
        }
      } catch (err) {
        console.error(`Failed to parse ${srtFile}:`, err.message);
      }
    }
    
    // Save to cache
    cache[cacheKey] = {
      timestamp: Date.now(),
      data: flightPaths
    };
    await fs.writeJson(TELEMETRY_DB, cache, { spaces: 2 });
    
    return res.json({
      enabled: true,
      settings: settings.flight_path_3d,
      flightPaths
    });
  } catch (err) {
    console.error('[Flight Path API] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
