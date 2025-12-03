const usbQueue = require('../../lib/bullQueue');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      usbQueue.getWaiting(),
      usbQueue.getActive(),
      usbQueue.getCompleted(),
      usbQueue.getFailed(),
      usbQueue.getDelayed()
    ]);

    const activeJobsWithProgress = await Promise.all(active.map(async (job) => {
      const progressData = job._progress || {};
      const progress = typeof progressData === 'number' ? progressData : (progressData.percent || 0);
      return {
        id: job.id,
        data: job.data,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        progress,
        currentFile: progressData.currentFile || null,
        moved: progressData.moved || 0,
        total: progressData.total || 0
      };
    }));

    const stats = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      activeJobs: activeJobsWithProgress,
      waitingJobs: waiting.map(job => ({
        id: job.id,
        data: job.data,
        timestamp: job.timestamp
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('[Queue Status] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
