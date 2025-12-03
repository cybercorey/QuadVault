const fs = require('fs-extra');

const CONFIG_FILE = '/app/config.json';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const config = await fs.readJson(CONFIG_FILE);
      res.status(200).json({ allowed: config.devices || [] });
    } catch (e) {
      console.error('[config API] GET error:', e);
      res.status(500).json({ error: 'failed to read config' });
    }
  } else if (req.method === 'POST') {
    try {
      const { allowed } = req.body;
      if (!allowed || !Array.isArray(allowed)) {
        return res.status(400).json({ error: 'Invalid config format' });
      }

      const config = await fs.readJson(CONFIG_FILE);
      config.devices = allowed;
      await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
      
      res.status(200).json({ success: true });
    } catch (e) {
      console.error('[config API] POST error:', e);
      res.status(500).json({ error: 'failed to save' });
    }
  } else {
    res.status(405).end();
  }
}
