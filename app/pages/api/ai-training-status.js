const fs = require('fs-extra');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Read status from worker container files
      const datasetStatus = await readStatusFile('/tmp/dataset-status.json');
      const trainingStatus = await readStatusFile('/tmp/training-status.json');
      const batchStatus = await readStatusFile('/tmp/batch-status.json');
      
      return res.json({
        dataset: datasetStatus,
        training: trainingStatus,
        batch: batchStatus
      });
    } catch (err) {
      return res.json({
        dataset: null,
        training: null,
        batch: null
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function readStatusFile(path) {
  try {
    if (await fs.pathExists(path)) {
      return await fs.readJson(path);
    }
  } catch (err) {
    console.error(`Failed to read ${path}:`, err.message);
  }
  return null;
}
