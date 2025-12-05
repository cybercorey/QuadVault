const fs = require('fs-extra');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    if (await fs.pathExists(path)) {
      const labels = await fs.readJson(path);
      return res.json({ 
        success: true,
        labels,
        path
      });
    } else {
      return res.json({ 
        success: false,
        message: 'Labels file not found'
      });
    }

  } catch (err) {
    console.error('[AI Load Labels] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
