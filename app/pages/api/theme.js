const fs = require('fs-extra');
const path = require('path');

const CONFIG_FILE = '/app/config.json';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const config = await fs.readJson(CONFIG_FILE);
      res.status(200).json(config.theme || {});
    } catch (e) {
      console.error('[theme API] GET error:', e);
      res.status(500).json({ error: 'failed to read theme' });
    }
  } else if (req.method === 'POST') {
    try {
      const { background_type, primary_gradient, secondary_gradient, accent_color, panel_opacity } = req.body;
      
      const config = await fs.readJson(CONFIG_FILE);
      config.theme = {
        background_type: background_type || 'galaxy',
        primary_gradient: primary_gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        secondary_gradient: secondary_gradient || 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        accent_color: accent_color || '#8b5cf6',
        panel_opacity: panel_opacity || 0.85
      };
      await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
      
      res.status(200).json({ success: true });
    } catch (e) {
      console.error('[theme API] POST error:', e);
      res.status(500).json({ error: 'failed to save theme' });
    }
  } else {
    res.status(405).end();
  }
}
