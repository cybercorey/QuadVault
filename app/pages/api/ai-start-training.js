const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs-extra');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { datasetPath, epochs = 50, batchSize = 32 } = req.body;

    // Check if dataset exists
    if (!await fs.pathExists('/tmp/training/dataset.json')) {
      return res.status(400).json({ 
        error: 'Dataset not found',
        hint: 'Prepare dataset first in Step 1'
      });
    }

    // Check if PyTorch is installed
    const checkPyTorch = `docker exec quadvault-worker-dev bash -c "python3 -c 'import torch' 2>&1"`;
    try {
      await execAsync(checkPyTorch);
    } catch (err) {
      return res.status(400).json({
        error: 'PyTorch not installed in worker container',
        hint: 'Run: docker exec quadvault-worker-dev pip3 install torch torchvision pillow tqdm'
      });
    }

    // Start training in background
    const command = `docker exec quadvault-worker-dev bash -c "python3 train_classifier.py /tmp/training/dataset.json --epochs ${epochs} --batch-size ${batchSize} > /tmp/training.log 2>&1 &"`;
    
    await execAsync(command);

    return res.json({ 
      success: true,
      message: `Training started with ${epochs} epochs, batch size ${batchSize}`,
      logPath: '/tmp/training.log'
    });

  } catch (err) {
    console.error('[AI Training] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
