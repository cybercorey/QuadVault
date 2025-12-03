const fs = require('fs-extra');
const { storageCache, loadPersisted, computeStorage } = require('../../lib/storage');

const STORAGE_CACHE_FILE = '/app/storage-cache.json';

export default async function handler(req, res){
  if (req.method === 'GET') {
    try {
      // Always read from file to get latest data
      let cacheData = { total: null, avail: null, children: [], lastUpdated: 0 };
      
      try {
        cacheData = await fs.readJson(STORAGE_CACHE_FILE);
      } catch (e) {
        console.log('[storage API] No cache file found, returning empty data');
      }
      
      res.json({ 
        total: cacheData.total, 
        avail: cacheData.avail, 
        children: cacheData.children || [], 
        lastUpdated: cacheData.lastUpdated || 0, 
        computing: storageCache.computing 
      });
    } catch (e) {
      console.error('[storage API] Error:', e);
      res.status(500).json({ error: 'Failed to read storage data' });
    }
  } else if (req.method === 'POST') {
    // Trigger a fresh computation
    try {
      computeStorage().catch(() => {});
      res.json({ success: true, message: 'Storage refresh triggered' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to trigger refresh' });
    }
  } else {
    res.status(405).end();
  }
}
