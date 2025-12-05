import Queue from 'bull';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { jobId } = req.body;

    if (!jobId) {
        return res.status(400).json({ success: false, error: 'Missing jobId' });
    }

    try {
        const usbQueue = new Queue('usb-jobs', process.env.REDIS_URL || 'redis://localhost:6379');
        
        const job = await usbQueue.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        const state = await job.getState();
        
        // Only allow cancelling jobs that are waiting or delayed (not active)
        if (state === 'waiting' || state === 'delayed') {
            await job.remove();
            return res.status(200).json({ success: true, message: 'Job cancelled and removed from queue' });
        } else if (state === 'active') {
            // For active jobs, we can't safely cancel mid-processing
            // But we can try to fail it (this will mark it as failed and stop retry attempts)
            await job.moveToFailed({ message: 'Job cancelled by user' }, true);
            return res.status(200).json({ success: true, message: 'Job marked as cancelled' });
        } else {
            return res.status(400).json({ success: false, error: `Cannot cancel job in ${state} state` });
        }

    } catch (error) {
        console.error('[cancel-job] Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
