const Queue = require('bull');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Bull queue for USB device sync jobs
const usbQueue = new Queue('usb-jobs', REDIS_URL, {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: false, // Keep completed jobs for history
        removeOnFail: false      // Keep failed jobs for debugging
    },
    settings: {
        stalledInterval: 30000,    // Check for stalled jobs every 30 seconds
        maxStalledCount: 2,        // Max times job can be stalled before failing
    }
});

// Queue event handlers for logging
usbQueue.on('completed', (job, result) => {
    console.log(`[Bull Queue] Job ${job.id} completed:`, result);
});

usbQueue.on('failed', (job, err) => {
    console.error(`[Bull Queue] Job ${job.id} failed:`, err.message);
});

usbQueue.on('stalled', (job) => {
    console.warn(`[Bull Queue] Job ${job.id} stalled`);
});

usbQueue.on('active', (job) => {
    console.log(`[Bull Queue] Job ${job.id} started processing`);
});

usbQueue.on('waiting', (jobId) => {
    console.log(`[Bull Queue] Job ${jobId} is waiting`);
});

// Export queue instance
module.exports = usbQueue;
