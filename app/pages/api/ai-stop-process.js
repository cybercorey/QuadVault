const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { processType } = req.body;

    // Kill the corresponding process
    const commands = {
      dataset: `docker exec quadvault-worker-dev pkill -f "aiTrainer.js prepare-dataset"`,
      training: `docker exec quadvault-worker-dev pkill -f "train_classifier.py"`,
      batch: `docker exec quadvault-worker-dev pkill -f "aiTrainer.js batch-classify"`
    };

    if (!commands[processType]) {
      return res.status(400).json({ error: 'Invalid process type' });
    }

    try {
      await execAsync(commands[processType]);
    } catch (err) {
      // pkill returns error if no process found, which is fine
    }

    return res.json({ success: true, message: `${processType} process stopped` });

  } catch (err) {
    console.error('[AI Stop Process] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
