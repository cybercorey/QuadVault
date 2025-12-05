const fs = require('fs-extra');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path, labels } = req.body;

    if (!path || !labels) {
      return res.status(400).json({ error: 'Missing path or labels' });
    }

    // Ensure directory exists
    await fs.ensureDir(require('path').dirname(path));

    // Save labels file
    await fs.writeJson(path, labels, { spaces: 2 });

    return res.json({ 
      success: true,
      path,
      counts: {
        highlights: labels.highlights?.length || 0,
        normal: labels.normal?.length || 0
      }
    });

  } catch (err) {
    console.error('[AI Save Labels] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
