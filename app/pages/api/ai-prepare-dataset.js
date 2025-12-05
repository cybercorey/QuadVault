const fs = require('fs-extra');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { labelsPath } = req.body;

    if (!labelsPath) {
      return res.status(400).json({ error: 'Missing labelsPath' });
    }

    // Check if labels file exists
    if (!await fs.pathExists(labelsPath)) {
      return res.status(400).json({ 
        error: `Labels file not found: ${labelsPath}`,
        hint: 'Create labels.json in your Samba mount with highlight and normal video paths'
      });
    }

    // Read labels file to count videos
    const labels = await fs.readJson(labelsPath);
    const totalVideos = (labels.highlights?.length || 0) + (labels.normal?.length || 0);

    if (totalVideos === 0) {
      return res.status(400).json({ 
        error: 'Labels file is empty',
        hint: 'Add video paths to highlights and normal arrays'
      });
    }

    // Start dataset preparation in worker container
    const command = `docker exec quadvault-worker-dev bash -c "node aiTrainer.js prepare-dataset ${labelsPath} /tmp/training > /tmp/dataset-prep.log 2>&1 &"`;
    
    await execAsync(command);

    return res.json({ 
      success: true,
      total: totalVideos,
      message: `Processing ${totalVideos} videos (${labels.highlights.length} highlights, ${labels.normal.length} normal)`
    });

  } catch (err) {
    console.error('[AI Dataset] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
