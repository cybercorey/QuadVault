const fs = require('fs-extra');
const path = require('path');
const { getAdvancedSettings } = require('../../lib/advancedSettings');

const DEST_ROOT = process.env.DEST_ROOT || '/mnt/network_share';
const ANALYTICS_DB = '/app/storage-analytics.json';

// Calculate file hash for duplicate detection
async function calculateFileHash(filePath, algorithm = 'xxhash') {
  const crypto = require('crypto');
  
  if (algorithm === 'xxhash') {
    // For now, use size+mtime as simple hash (would need xxhash package for real implementation)
    const stats = await fs.stat(filePath);
    return `${stats.size}-${stats.mtimeMs}`;
  }
  
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm === 'sha256' ? 'sha256' : 'md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Recursively scan directory
async function scanDirectory(dir, settings) {
  const results = {
    totalSize: 0,
    fileCount: 0,
    byDevice: {},
    byType: {},
    files: [],
    duplicates: []
  };
  
  async function scan(currentPath, deviceName = 'unknown') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Track device-level stats
          const relativePath = path.relative(DEST_ROOT, fullPath);
          const pathParts = relativePath.split(path.sep);
          const currentDevice = pathParts[0] || deviceName;
          
          await scan(fullPath, currentDevice);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            const ext = path.extname(entry.name).toLowerCase();
            const relativePath = path.relative(DEST_ROOT, fullPath);
            const pathParts = relativePath.split(path.sep);
            const device = pathParts[0] || deviceName;
            
            results.totalSize += stats.size;
            results.fileCount++;
            
            // Track per-device
            if (settings.storage_analytics.track_per_device) {
              if (!results.byDevice[device]) {
                results.byDevice[device] = { size: 0, count: 0 };
              }
              results.byDevice[device].size += stats.size;
              results.byDevice[device].count++;
            }
            
            // Track by file type
            if (settings.storage_analytics.track_file_types) {
              const type = ext || 'no_extension';
              if (!results.byType[type]) {
                results.byType[type] = { size: 0, count: 0 };
              }
              results.byType[type].size += stats.size;
              results.byType[type].count++;
            }
            
            // Duplicate detection (only for large files)
            if (settings.storage_analytics.duplicate_detection) {
              const minSize = (settings.storage_analytics.duplicate_min_size_mb || 10) * 1024 * 1024;
              if (stats.size >= minSize) {
                results.files.push({
                  path: fullPath,
                  size: stats.size,
                  mtime: stats.mtimeMs,
                  device,
                  ext
                });
              }
            }
          } catch (err) {
            // Skip files that can't be read
            console.error(`[Analytics] Error reading file ${fullPath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`[Analytics] Error scanning ${currentPath}:`, err.message);
    }
  }
  
  await scan(dir);
  
  // Find duplicates by size+mtime (simple approach)
  if (settings.storage_analytics.duplicate_detection && results.files.length > 0) {
    const sizeMap = {};
    results.files.forEach(file => {
      const key = `${file.size}`;
      if (!sizeMap[key]) {
        sizeMap[key] = [];
      }
      sizeMap[key].push(file);
    });
    
    // Files with same size are potential duplicates
    Object.values(sizeMap).forEach(group => {
      if (group.length > 1) {
        results.duplicates.push({
          size: group[0].size,
          count: group.length,
          files: group.map(f => f.path),
          potentialSavings: group[0].size * (group.length - 1)
        });
      }
    });
  }
  
  return results;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { action } = req.query;
    
    if (action === 'compute') {
      // Compute analytics now
      try {
        const settings = await getAdvancedSettings();
        
        if (!settings.storage_analytics.enabled) {
          return res.json({ error: 'Storage analytics disabled' });
        }
        
        console.log('[Analytics] Starting storage scan...');
        const results = await scanDirectory(DEST_ROOT, settings);
        
        const analytics = {
          timestamp: Date.now(),
          totalSize: results.totalSize,
          totalFiles: results.fileCount,
          byDevice: results.byDevice,
          byType: results.byType,
          duplicates: results.duplicates,
          potentialSavings: results.duplicates.reduce((sum, dup) => sum + dup.potentialSavings, 0)
        };
        
        // Save to database
        let db = { history: [], current: null };
        if (await fs.pathExists(ANALYTICS_DB)) {
          db = await fs.readJson(ANALYTICS_DB);
        }
        
        // Keep history based on retention settings
        const retentionMs = (settings.storage_analytics.retention_days || 365) * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - retentionMs;
        db.history = (db.history || []).filter(entry => entry.timestamp > cutoff);
        
        // Add to history
        db.history.push(analytics);
        db.current = analytics;
        
        await fs.writeJson(ANALYTICS_DB, db, { spaces: 2 });
        
        console.log('[Analytics] Scan complete:', {
          files: analytics.totalFiles,
          size: (analytics.totalSize / (1024 ** 3)).toFixed(2) + ' GB',
          duplicates: analytics.duplicates.length
        });
        
        return res.json({ success: true, analytics });
      } catch (err) {
        console.error('[Analytics] Compute failed:', err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Return current analytics
    try {
      if (await fs.pathExists(ANALYTICS_DB)) {
        const db = await fs.readJson(ANALYTICS_DB);
        return res.json({
          success: true,
          current: db.current,
          history: db.history || []
        });
      }
      
      return res.json({ success: true, current: null, history: [] });
    } catch (err) {
      console.error('[Analytics] Failed to load:', err);
      return res.status(500).json({ error: err.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
