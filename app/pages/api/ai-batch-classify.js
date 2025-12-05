const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs-extra');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { libraryPath, modelPath = '/tmp/training/model.pth' } = req.body;

    if (!libraryPath) {
      return res.status(400).json({ error: 'Missing libraryPath' });
    }

    // Check if library path exists
    if (!await fs.pathExists(libraryPath)) {
      return res.status(400).json({ 
        error: `Library path not found: ${libraryPath}`,
        hint: 'Make sure your Samba mount is accessible'
      });
    }

    // Check if model exists (optional - can use CLIP if no model)
    const useClip = !await fs.pathExists(modelPath);

    // Start batch classification in background
    const outputPath = '/tmp/highlights.json';
    const command = useClip
      ? `docker exec quadvault-worker-dev bash -c "node aiTrainer.js batch-classify ${libraryPath} clip ${outputPath} > /tmp/batch-classify.log 2>&1 &"`
      : `docker exec quadvault-worker-dev bash -c "node aiTrainer.js batch-classify ${libraryPath} ${modelPath} ${outputPath} > /tmp/batch-classify.log 2>&1 &"`;
    
    await execAsync(command);

    return res.json({ 
      success: true,
      message: useClip 
        ? 'Batch classification started using CLIP model'
        : 'Batch classification started using custom trained model',
      modelType: useClip ? 'CLIP' : 'Custom',
      outputPath
    });

  } catch (err) {
    console.error('[AI Batch Classify] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
