const usbQueue = require('../../lib/bullQueue');

export default async function handler(req, res){
  if (req.method === 'DELETE') {
    // Delete jobs from queue
    try {
      const { jobId, all } = req.query;
      
      if (all === 'true') {
        // Clean up all completed and failed jobs
        await usbQueue.clean(0, 'completed');
        await usbQueue.clean(0, 'failed');
        return res.json({ success: true, message: 'All jobs cleaned' });
      }
      
      if (jobId) {
        // Remove specific job
        const job = await usbQueue.getJob(jobId);
        if (job) {
          await job.remove();
          return res.json({ success: true, message: 'Job deleted' });
        }
        return res.status(404).json({ error: 'Job not found' });
      }
      
      return res.status(400).json({ error: 'Missing jobId or all parameter' });
    } catch (err) {
      console.error('[History DELETE] Error:', err);
      return res.status(500).json({ error: 'Failed to delete jobs' });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  // Get jobs from Bull queue
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      usbQueue.getWaiting(),
      usbQueue.getActive(),
      usbQueue.getCompleted(),
      usbQueue.getFailed(),
      usbQueue.getDelayed()
    ]);

    // Combine all jobs and sort by timestamp
    const allJobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
    allJobs.sort((a, b) => b.timestamp - a.timestamp);

    // If specific job ID requested
    if (req.query.id) {
      const job = allJobs.find(j => j.id === req.query.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Format the job
      const state = await job.getState();
      const progressData = job._progress || {};
      const progress = typeof progressData === 'number' ? progressData : (progressData.percent || 0);
      
      const deviceName = job.data.config?.friendlyName || 
                        job.data.config?.outputPath || 
                        progressData.deviceName ||
                        'Unknown';
      
      const formattedJob = {
        id: job.id,
        uuid: job.data.uuid || progressData.uuid,
        device_name: deviceName,
        status: state === 'completed' ? 'Completed' : 
                state === 'failed' ? 'Failed' : 
                state === 'active' ? 'Running' : 
                state === 'waiting' || state === 'delayed' ? 'Queued' : state,
        progress,
        currentFile: progressData.currentFile || null,
        moved: progressData.moved || 0,
        total: progressData.total || 0,
        timestamp: new Date(job.timestamp),
        processedOn: job.processedOn ? new Date(job.processedOn) : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
        data: job.data,
        files_moved: job.returnvalue?.files_moved || null,
        total_size: job.returnvalue?.total_size || null,
        duration_seconds: job.returnvalue?.duration_seconds || null,
        files_json: job.returnvalue?.files_json || null,
        logs_json: job.returnvalue?.logs_json || null,
        merge_json: job.returnvalue?.merge_json || null
      };
      
      return res.json({ job: formattedJob });
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    let limit = Math.max(1, parseInt(req.query.limit || '50', 10));
    if (limit > 100) limit = 100;
    const offset = (page - 1) * limit;

    const paginatedJobs = allJobs.slice(offset, offset + limit);

    // Format jobs for frontend
    const formattedJobs = await Promise.all(paginatedJobs.map(async (job) => {
      const state = await job.getState();
      const progressData = job._progress || {};
      const progress = typeof progressData === 'number' ? progressData : (progressData.percent || 0);
      
      return {
        id: job.id,
        uuid: job.data.uuid,
        device_name: job.data.config?.friendlyName || job.data.config?.outputPath || 'Unknown',
        status: state === 'completed' ? 'Completed' : 
                state === 'failed' ? 'Failed' : 
                state === 'active' ? 'Running' : 
                state === 'waiting' || state === 'delayed' ? 'Queued' : state,
        progress,
        currentFile: progressData.currentFile || null,
        moved: progressData.moved || 0,
        total: progressData.total || 0,
        timestamp: new Date(job.timestamp),
        processedOn: job.processedOn ? new Date(job.processedOn) : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
        data: job.data,
        files_moved: job.returnvalue?.files_moved || null,
        total_size: job.returnvalue?.total_size || null,
        duration_seconds: job.returnvalue?.duration_seconds || null,
        files_json: job.returnvalue?.files_json || null,
        logs_json: job.returnvalue?.logs_json || null,
        merge_json: job.returnvalue?.merge_json || null
      };
    }));

    res.json({ 
      page, 
      limit, 
      total: allJobs.length, 
      jobs: formattedJobs 
    });
  } catch (err) {
    console.error('[History] Error:', err);
    res.status(500).json({ error: 'Failed to read history' });
  }
}
