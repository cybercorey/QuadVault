const Queue = require('bull');
const io = require('socket.io-client');
const fs = require('fs-extra');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Import shared libraries from frontend (mounted as volume)
const { computeStorage, DEST_ROOT } = require('/app/lib/storage');
const { mergeFolder, stabilizeAndMergeFolder } = require('./merger');
const { getAdvancedSettings } = require('/app/lib/advancedSettings');
const { shouldCopyFile } = require('./fileHashCache');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MOUNT_POINT = process.env.MOUNT_POINT || '/mnt/usb_incoming';
const GPU_SUPPORT = process.env.GPU_SUPPORT === 'true';

console.log('[Worker] Starting USB Automator Worker...');
console.log('[Worker] Redis URL:', REDIS_URL);
console.log('[Worker] Frontend URL:', FRONTEND_URL);
console.log('[Worker] GPU Support:', GPU_SUPPORT ? 'ENABLED' : 'DISABLED');

// Detect GPU capabilities at startup
let GPU_AVAILABLE = false;
if (GPU_SUPPORT) {
    try {
        // Check if gyroflow can detect GPU
        const result = execSync('/worker/gyroflow --help 2>&1', { encoding: 'utf8', timeout: 5000 });
        GPU_AVAILABLE = !result.includes('ERROR');
        console.log('[Worker] GPU Detection:', GPU_AVAILABLE ? 'GPU Available' : 'GPU Not Detected');
    } catch (error) {
        console.log('[Worker] GPU Detection: Failed -', error.message);
        GPU_AVAILABLE = false;
    }
} else {
    console.log('[Worker] GPU Detection: Skipped (CPU-only build)');
}

// Export capabilities for API
const WORKER_CAPABILITIES = {
    gpu_support: GPU_SUPPORT,
    gpu_available: GPU_AVAILABLE,
    stabilization_enabled: GPU_SUPPORT && GPU_AVAILABLE,
    merge_enabled: true,
    sync_enabled: true
};

console.log('[Worker] Capabilities:', JSON.stringify(WORKER_CAPABILITIES, null, 2));

// Connect to frontend's Socket.io server to emit progress updates
const socket = io(FRONTEND_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

socket.on('connect', () => {
    console.log('[Worker] Connected to frontend Socket.io server');
    // Emit capabilities on connect so frontend knows what's available
    socket.emit('worker_capabilities', WORKER_CAPABILITIES);
});

socket.on('disconnect', () => {
    console.log('[Worker] Disconnected from frontend Socket.io server');
});

socket.on('connect_error', (error) => {
    console.error('[Worker] Socket.io connection error:', error.message);
});

// Respond to capability requests
socket.on('request_capabilities', () => {
    console.log('[Worker] Capability request received');
    socket.emit('worker_capabilities', WORKER_CAPABILITIES);
});

// Create Bull queue worker with settings for long-running jobs
const usbQueue = new Queue('usb-jobs', REDIS_URL, {
    settings: {
        lockDuration: 600000, // 10 minutes
        lockRenewTime: 30000,  // Renew every 30 seconds
        stalledInterval: 60000 // Check for stalled jobs every minute
    }
});

console.log('[Worker] Queue configured, waiting for jobs...');

// Load concurrency settings (set at startup, requires restart to change)
let concurrencySettings = { syncConcurrency: 1, mergeConcurrency: 1, stabilizeConcurrency: 1 };

async function loadConcurrencySettings() {
    try {
        const settings = await getAdvancedSettings();
        const parallel = settings.parallel_processing || {};
        
        concurrencySettings = {
            syncConcurrency: parallel.enabled ? Math.floor(parallel.max_concurrent_devices || 1) : 1,
            mergeConcurrency: parallel.enabled ? Math.floor(parallel.max_concurrent_jobs || 2) : 1,
            stabilizeConcurrency: parallel.enabled ? Math.floor(parallel.max_concurrent_jobs || 2) : 1
        };
        console.log('[Worker] Concurrency settings loaded:', concurrencySettings);
        console.log('[Worker] Note: Changing concurrency requires worker restart');
    } catch (err) {
        console.error('[Worker] Failed to load concurrency settings:', err.message);
        concurrencySettings = { syncConcurrency: 1, mergeConcurrency: 1, stabilizeConcurrency: 1 };
    }
}

// Initialize worker with async setup
async function initWorker() {
    await loadConcurrencySettings();
    console.log('[Worker] Queue configured with concurrency:', concurrencySettings);
    setupQueueProcessors();
}

function setupQueueProcessors() {

// Helper functions
async function safeCopyAndDelete(src, dest) {
    const tempDest = dest + '.part';
    await fs.copy(src, tempDest, { overwrite: true, preserveTimestamps: true });
    const srcStat = await fs.stat(src);
    const destStat = await fs.stat(tempDest);
    if (srcStat.size === destStat.size) {
        await fs.rename(tempDest, dest);
        await fs.remove(src);
    } else {
        await fs.remove(tempDest);
        throw new Error(`Integrity check failed: Size mismatch for ${path.basename(src)}`);
    }
}

function formatBytes(bytes){
    if(!bytes) return '0 B';
    const k=1024; const sizes=['B','KB','MB','GB','TB'];
    const i=Math.floor(Math.log(bytes)/Math.log(k));
    return Math.round(bytes/Math.pow(k,i)*100)/100+' '+sizes[i];
}

// Extract creation date from DJI SRT subtitle file
async function getDateFromSRT(videoPath) {
    try {
        // DJI creates .SRT files alongside .MP4 files with GPS and timestamp data
        const srtPath = videoPath.replace(/\.(mp4|MP4|mov|MOV)$/i, '.SRT');
        if (!await fs.pathExists(srtPath)) {
            return null;
        }
        
        const content = await fs.readFile(srtPath, 'utf8');
        // Look for datetime in format: 2024-12-03 14:30:45
        // Must be after year 2000 to be valid (excludes 1970 epoch times)
        const dateMatch = content.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        if (dateMatch) {
            const date = new Date(dateMatch[1]);
            if (date.getFullYear() >= 2000) { // Sanity check
                return date;
            }
        }
    } catch (e) {
        // SRT file not found or couldn't be read
    }
    return null;
}

// Extract date from filesystem path (fallback when file timestamps are wrong)
function getDateFromPath(filePath) {
    try {
        // Try to extract date from common path patterns
        // Examples: "2024-12-03", "23-11-2025", "12-03-2024_14-30", etc.
        
        // Pattern 1: YYYY-MM-DD
        let match = filePath.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const date = new Date(match[1], match[2] - 1, match[3]);
            if (date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
                return date;
            }
        }
        
        // Pattern 2: DD-MM-YYYY
        match = filePath.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (match) {
            const date = new Date(match[3], match[2] - 1, match[1]);
            if (date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
                return date;
            }
        }
    } catch (e) {
        // Invalid date
    }
    return null;
}

// Generate thumbnail for video file
async function generateThumbnail(videoPath, outputPath) {
    try {
        const dir = path.dirname(outputPath);
        await fs.ensureDir(dir);
        
        // Use FFmpeg to extract frame at 1 second, scale to 320px width
        execSync(
            `ffmpeg -ss 1 -i "${videoPath}" -vframes 1 -vf "scale=320:-1" "${outputPath}" -y`,
            { stdio: 'pipe' }
        );
        return true;
    } catch (error) {
        console.error(`[Thumbnail] Failed for ${path.basename(videoPath)}: ${error.message}`);
        return false;
    }
}

// Main job processor - stores everything in memory and returns to Bull job
async function processDrive(deviceNode, uuid, config, job){
    const devPath = `/dev/${deviceNode}`;
    const ts = new Date().toISOString().replace(/T/,'_').replace(/\..+/,'').replace(/:/g,'-');
    const syncStartDate = new Date(); // Capture sync time for file dating
    const outFolder = config.outputPath || config.name || config.friendlyName || 'unknown_device';
    const targetDir = path.join(DEST_ROOT, outFolder, ts);
    const startTs = Date.now();
    const jobName = config.friendlyName || config.outputPath || config.name || uuid;
    
    // Store logs in memory instead of database
    const logs = [];
    const addLog = (msg, type = 'info') => {
        const entry = { timestamp: Date.now(), msg, type };
        logs.push(entry);
        socket.emit('job_log', { jobId: job.id, entry });
    };
    
    // Emit job start
    const progressData = {jobId: job.id, uuid, percent:0, currentFile:'Starting...', moved:0, total:0, status:'Running', deviceName: jobName};
    socket.emit('progress', progressData);
    await job.progress(progressData);

    let processedFiles = [];
    let totalSize = 0;
    let merges = [];

    try {
        try{execSync(`umount ${devPath} 2>/dev/null`);}catch(e){}
        socket.emit('log', { timestamp: new Date(), msg: `Mounting ${devPath}`, type: 'info' });
        addLog(`Mounting ${devPath}`);
        fs.ensureDirSync(MOUNT_POINT);
        
        // Try normal mount first, fallback to read-only for NTFS issues
        let mountedReadOnly = false;
        try {
            execSync(`mount ${devPath} ${MOUNT_POINT}`);
        } catch (mountErr) {
            const errMsg = mountErr.message || mountErr.toString();
            if (errMsg.includes('NTFS') || errMsg.includes('ntfs') || errMsg.includes('MFT')) {
                socket.emit('log', { timestamp: new Date(), msg: `NTFS error detected, trying read-only mount...`, type: 'warn' });
                addLog(`NTFS mount failed, attempting read-only mount`, 'warn');
                
                const mountStrategies = [
                    { cmd: `mount -t ntfs-3g -o ro,remove_hiberfile ${devPath} ${MOUNT_POINT}`, desc: 'ntfs-3g with remove_hiberfile' },
                    { cmd: `mount -t ntfs-3g -o ro ${devPath} ${MOUNT_POINT}`, desc: 'ntfs-3g read-only' },
                    { cmd: `mount -o ro,noload ${devPath} ${MOUNT_POINT}`, desc: 'read-only with noload' },
                    { cmd: `mount -o ro ${devPath} ${MOUNT_POINT}`, desc: 'basic read-only' }
                ];
                
                let mountSuccess = false;
                for (const strategy of mountStrategies) {
                    try {
                        socket.emit('log', { timestamp: new Date(), msg: `Attempting: ${strategy.desc}`, type: 'info' });
                        execSync(strategy.cmd);
                        mountedReadOnly = true;
                        mountSuccess = true;
                        socket.emit('log', { timestamp: new Date(), msg: `Mounted read-only using: ${strategy.desc}`, type: 'info' });
                        addLog(`Successfully mounted read-only (${strategy.desc})`);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!mountSuccess) {
                    const msg = `All mount attempts failed. NTFS filesystem is severely corrupted.\nRun Windows chkdsk /f to repair, or access files from Windows.`;
                    socket.emit('log', { timestamp: new Date(), msg, type: 'error' });
                    throw new Error(msg);
                }
            } else {
                throw mountErr;
            }
        }
        
        if (mountedReadOnly && !config.dryRun && !config.dry_run) {
            socket.emit('log', { timestamp: new Date(), msg: `Read-only mount: forcing dry-run mode (copy only)`, type: 'warn' });
            addLog(`Forcing dry-run mode due to read-only mount`, 'warn');
            config.dryRun = true;
        }

        let srcDir = MOUNT_POINT;
        if(config.sourcePath) srcDir = path.join(MOUNT_POINT, config.sourcePath.replace(/^\/+/,''));
        if(!fs.existsSync(srcDir)) throw new Error(`Source ${config.sourcePath} missing`);

        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.MP4', '.MOV', '.AVI', '.MKV'];
        const files = [];
        
        async function getFiles(dir){
            const dirents = await fs.readdir(dir,{withFileTypes:true});
            for(const d of dirents){
                const res = path.resolve(dir,d.name);
                if(d.isDirectory()) await getFiles(res);
                else {
                    const ext = path.extname(res);
                    if(videoExtensions.includes(ext)) {
                        const stat=await fs.stat(res);
                        
                        // Try multiple sources for the correct file date
                        let fileDate = null;
                        
                        // 1. Try to get date from DJI SRT file (most accurate when drone clock is set)
                        fileDate = await getDateFromSRT(res);
                        
                        // 2. Try to parse date from source directory path
                        if (!fileDate) {
                            fileDate = getDateFromPath(res);
                        }
                        
                        // 3. Fall back to birthtime if available and valid (after 1980)
                        if (!fileDate && stat.birthtime && stat.birthtime.getFullYear() >= 1980) {
                            fileDate = stat.birthtime;
                        }
                        
                        // 4. Fall back to mtime if valid (after 1980)
                        if (!fileDate && stat.mtime && stat.mtime.getFullYear() >= 1980) {
                            fileDate = stat.mtime;
                        }
                        
                        // 5. Last resort: use sync processing time (when drone clock wasn't set)
                        if (!fileDate) {
                            fileDate = syncStartDate;
                        }
                        
                        files.push({path:res, size:stat.size, date:fileDate});
                        totalSize+=stat.size;
                    }
                }
            }
        }
        await getFiles(srcDir);
        socket.emit('log', { timestamp: new Date(), msg: `Found ${files.length} video files. Moving...`, type: 'info' });
        addLog(`Found ${files.length} video files to process.`);

        if (files.length > 0) fs.ensureDirSync(targetDir);

        if (files.length === 0) {
            const duration = Math.round((Date.now() - startTs) / 1000);
            socket.emit('log', { timestamp: new Date(), msg: `Nothing to do for ${jobName} (${outFolder}).`, type:'info' });
            socket.emit('job_complete', { id: job.id, status: 'Nothing to do' });
            addLog('Nothing to do for this device.');
            computeStorage().catch(()=>{});
            try { execSync(`umount ${MOUNT_POINT} 2>/dev/null`); } catch (e) {}
            
            // Still include targetFolder even for "nothing to do" in case user wants to merge existing files
            await job.update({
                ...job.data,
                targetFolder: targetDir
            });
            
            return {
                success: true,
                uuid,
                device_name: jobName,
                status: 'Nothing to do',
                files_moved: 0,
                total_size: 0,
                duration_seconds: duration,
                targetFolder: targetDir,
                files_json: JSON.stringify([]),
                logs_json: JSON.stringify(logs),
                merge_json: JSON.stringify([])
            };
        }

        let moved=0;
        let skipped=0;
        const dryRun = !!(config.dryRun || config.dry_run);
        const advSettings = await getAdvancedSettings();
        
        for(const f of files){
            const rel = path.relative(srcDir, f.path);
            const dest = path.join(targetDir, rel);
            await fs.ensureDir(path.dirname(dest));
            
            // Check if we should skip this file (incremental sync)
            if (advSettings.incremental_sync?.enabled && advSettings.incremental_sync?.skip_unchanged) {
                const check = await shouldCopyFile(f.path, dest, advSettings);
                if (!check.shouldCopy) {
                    skipped++;
                    addLog(`Skipped (${check.reason}): ${rel}`, 'info');
                    continue;
                }
                addLog(`Copying (${check.reason}): ${rel}`, 'info');
            }
            
            try{
                if(dryRun){
                    const tempDest = dest + '.part';
                    await fs.copy(f.path, tempDest, { overwrite: true, preserveTimestamps: true });
                    await fs.rename(tempDest, dest);
                } else {
                    await safeCopyAndDelete(f.path, dest);
                }
            }catch(err){
                addLog(`Failed to copy file ${rel}: ${err.message}`, 'error');
                throw err;
            }
            
            // Use the file date from source (captured during scanning)
            const fileDate = f.date || new Date();
            
            // Generate thumbnail for video files
            let thumbnailPath = null;
            const ext = path.extname(dest).toLowerCase();
            if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
                const thumbName = path.basename(dest, ext) + '_thumb.jpg';
                const thumbPath = path.join(path.dirname(dest), thumbName);
                const thumbGenerated = await generateThumbnail(dest, thumbPath);
                if (thumbGenerated) {
                    thumbnailPath = path.relative(targetDir, thumbPath);
                    addLog(`Generated thumbnail: ${thumbName}`);
                }
            }
            
            processedFiles.push({ 
                path: rel, 
                size: f.size,
                date: fileDate.toISOString(),
                thumbnail: thumbnailPath
            });
            moved++;
            const remaining = files.length - moved;
            const sizeStr = formatBytes(f.size);
            const logMsg = `Completed: ${rel} (${sizeStr}) — ${moved}/${files.length} (${remaining} remaining)`;
            addLog(logMsg);
            socket.emit('log', { timestamp: new Date(), msg: logMsg, type: 'info' });
            const progressUpdate = {jobId: job.id, uuid, percent:Math.round((moved/files.length)*100), currentFile:rel, moved, total:files.length, status:'Running', deviceName: jobName};
            socket.emit('progress', progressUpdate);
            await job.progress(progressUpdate);
        }

        try { execSync('sync'); } catch(e) {}
        execSync(`umount ${MOUNT_POINT}`);

        const duration = Math.round((Date.now() - startTs) / 1000);
        const summaryMsg = `Complete for ${jobName} in ${duration}s. Copied: ${moved}, Skipped: ${skipped || 0}`;
        socket.emit('log', { timestamp: new Date(), msg: summaryMsg, type:'info' });
        socket.emit('job_complete', { id: job.id, status: 'Completed', uuid });
        
        // Queue merge/stabilize job after sync completes
        // If stabilize is enabled, queue merge first, which will then queue stabilize
        const mergerType = config.mergerType || (config.mergerEnabled || config.merger_enabled ? 'merge' : 'none');
        if (mergerType !== 'none') {
            // For stabilization, we first merge, then stabilize the merged output
            const shouldStabilize = mergerType === 'stabilize';
            const initialJobType = 'merge-videos';
            const jobIdPrefix = 'merge';
            
            try {
                const queueJob = await usbQueue.add(initialJobType, {
                    uuid,
                    config: {
                        ...config,
                        // Pass flag to indicate stabilization should follow
                        shouldStabilizeAfterMerge: shouldStabilize
                    },
                    targetFolder: targetDir,
                    jobType: mergerType
                }, {
                    jobId: `${jobIdPrefix}-${uuid}-${Date.now()}`,
                    priority: 2
                });
                
                const action = shouldStabilize ? 'merge then stabilize' : 'merge';
                socket.emit('log', { timestamp: new Date(), msg: `Queued ${action} job: ${queueJob.id}`, type: 'info' });
            } catch (error) {
                socket.emit('log', { timestamp: new Date(), msg: `Failed to queue ${mergerType} job: ${error.message}`, type: 'error' });
            }
        }
        
        socket.emit('job_complete', { id: job.id, status: 'Completed', uuid });
        computeStorage().catch(()=>{});
        
        // Update job data to include targetFolder for manual merge/stabilize triggers
        await job.update({
            ...job.data,
            targetFolder: targetDir
        });
        
        // Return all job data to be stored in Bull job
        return {
            success: true,
            uuid,
            device_name: jobName,
            status: 'Completed',
            files_moved: moved,
            total_size: totalSize,
            duration_seconds: duration,
            targetFolder: targetDir,
            files_json: JSON.stringify(processedFiles),
            logs_json: JSON.stringify(logs),
            merge_json: JSON.stringify(merges)
        };

    } catch(e) {
        socket.emit('log', { timestamp: new Date(), msg: `Error: ${e.message}`, type:'error' });
        addLog(`Error: ${e.message}`, 'error');
        try { execSync(`umount ${MOUNT_POINT} 2>/dev/null`); } catch(err){}
        const duration = Math.round((Date.now() - startTs) / 1000);
        socket.emit('job_complete', { id: job.id, status: 'Failed' });
        computeStorage().catch(()=>{});
        
        // Return failure data
        throw {
            success: false,
            uuid,
            device_name: jobName,
            status: 'Failed',
            files_moved: processedFiles.length,
            total_size: totalSize,
            duration_seconds: duration,
            files_json: JSON.stringify(processedFiles),
            logs_json: JSON.stringify(logs),
            merge_json: JSON.stringify(merges),
            error: e.message
        };
    }
}

// Process sync-device jobs (concurrency set at startup)
usbQueue.process('sync-device', concurrencySettings.syncConcurrency, async (job) => {
    console.log(`[Worker] Processing job ${job.id}:`, job.data);
    const { deviceNode, uuid, config } = job.data;
    
    try {
        const result = await processDrive(deviceNode, uuid, config, job);
        return result;
    } catch (error) {
        console.error(`[Worker] Job ${job.id} failed:`, error);
        throw error;
    }
});

// Process merge-videos jobs (concurrency set at startup)
usbQueue.process('merge-videos', concurrencySettings.mergeConcurrency, async (job) => {
    console.log(`[Worker] Processing merge job ${job.id}:`, job.data);
    const { uuid, config, targetFolder } = job.data;
    const jobName = config.friendlyName || config.outputPath || uuid;
    
    const logs = [];
    const addLog = (msg, type = 'info') => {
        logs.push({ timestamp: Date.now(), msg, type });
        socket.emit('job_log', { jobId: job.id, entry: { timestamp: Date.now(), msg, type } });
    };
    
    try {
        const deviceRoot = path.dirname(targetFolder);
        const outputFolder = path.join(deviceRoot, 'output');
        const mergerOpts = {
            outputFolder,
            name: config.mergerName || config.merger_name || path.basename(deviceRoot),
            removeSplits: !!(config.deleteAfterMerge || config.delete_after_merge),
            timeGap: config.mergerTimeGap || config.merger_time_gap || 10,
            mp4MergePath: path.join(process.cwd(), 'mp4_merge'),
            logger: async (msg, type = 'info') => {
                addLog(msg, type);
                socket.emit('log', { timestamp: new Date(), msg, type });
                
                const progressMatch = msg.match(/Processing merge (\d+)\/(\d+)/);
                if (progressMatch) {
                    const current = parseInt(progressMatch[1]);
                    const total = parseInt(progressMatch[2]);
                    const percent = Math.round((current / total) * 100);
                    const progressData = { 
                        jobId: job.id, uuid, percent, 
                        currentFile: `Merging flight ${current}/${total}`, 
                        moved: current, total, 
                        status: 'Merging',
                        deviceName: jobName
                    };
                    socket.emit('progress', progressData);
                    await job.progress(progressData);
                }
            }
        };
        
        socket.emit('log', { timestamp: new Date(), msg: `Starting merge for ${jobName}`, type: 'info' });
        const result = await mergeFolder(targetFolder, mergerOpts);
        
        socket.emit('log', { timestamp: new Date(), msg: `Merge complete: ${result.flights} flight(s)`, type: 'info' });
        socket.emit('job_complete', { id: job.id, status: 'Completed', uuid });
        
        // Calculate metrics for history display
        const files_moved = result.merges.reduce((sum, m) => sum + (m.inputs?.length || 0), 0);
        
        // Get total size of output files
        let total_size = 0;
        for (const merge of result.merges) {
            const outputPath = path.join(result.outputFolder, merge.output);
            if (await fs.pathExists(outputPath)) {
                const stats = await fs.stat(outputPath);
                total_size += stats.size;
            }
        }
        
        // Calculate duration (convert milliseconds to seconds)
        const duration_seconds = job.finishedOn && job.processedOn 
            ? (job.finishedOn - job.processedOn) / 1000 
            : 0;
        
        // If stabilization was requested, queue stabilize job now for the merged outputs
        if (config.shouldStabilizeAfterMerge) {
            if (!WORKER_CAPABILITIES.stabilization_enabled) {
                socket.emit('log', { timestamp: new Date(), msg: `⚠️  Stabilization skipped: GPU support not available`, type: 'warn' });
                addLog('Stabilization skipped: GPU support not available', 'warn');
            } else {
                try {
                    const stabilizeJob = await usbQueue.add('stabilize-videos', {
                        uuid,
                        config,
                        targetFolder: result.outputFolder, // Use output folder as target
                        jobType: 'stabilize'
                    }, {
                        jobId: `stabilize-${uuid}-${Date.now()}`,
                        priority: 2
                    });
                    
                    socket.emit('log', { timestamp: new Date(), msg: `Queued stabilization job: ${stabilizeJob.id}`, type: 'info' });
                } catch (error) {
                    socket.emit('log', { timestamp: new Date(), msg: `Failed to queue stabilization job: ${error.message}`, type: 'error' });
                }
            }
        }
        
        return {
            success: true,
            uuid,
            device_name: jobName,
            status: 'Completed',
            files_moved,
            total_size,
            duration_seconds,
            flights: result.flights,
            merge_json: JSON.stringify(result.merges),
            logs_json: JSON.stringify(logs)
        };
    } catch (error) {
        addLog(`Merge failed: ${error.message}`, 'error');
        socket.emit('log', { timestamp: new Date(), msg: `Merge failed: ${error.message}`, type: 'error' });
        socket.emit('job_complete', { id: job.id, status: 'Failed', uuid });
        throw error;
    }
});

// Process stabilize-videos jobs (concurrency set at startup)
usbQueue.process('stabilize-videos', concurrencySettings.stabilizeConcurrency, async (job) => {
    console.log(`[Worker] Processing stabilize job ${job.id}:`, job.data);
    const { uuid, config, targetFolder } = job.data;
    const jobName = config.friendlyName || config.outputPath || uuid;
    
    const logs = [];
    const addLog = (msg, type = 'info') => {
        logs.push({ timestamp: Date.now(), msg, type });
        socket.emit('job_log', { jobId: job.id, entry: { timestamp: Date.now(), msg, type } });
    };
    
    // Check if stabilization is available
    if (!WORKER_CAPABILITIES.stabilization_enabled) {
        const errorMsg = GPU_SUPPORT 
            ? 'GPU detected but not available - stabilization disabled'
            : 'Stabilization not available in CPU-only build';
        addLog(`⚠️  ${errorMsg}`, 'error');
        socket.emit('log', { timestamp: new Date(), msg: errorMsg, type: 'error' });
        socket.emit('job_complete', { id: job.id, status: 'Failed', uuid });
        throw new Error(errorMsg);
    }
    
    try {
        // When called after merge, targetFolder is already the output folder with merged files
        // Otherwise it's the source folder with original files
        const isOutputFolder = path.basename(targetFolder) === 'output';
        const deviceRoot = isOutputFolder ? path.dirname(targetFolder) : path.dirname(targetFolder);
        const inputFolder = isOutputFolder ? targetFolder : targetFolder; // Stabilize what's in targetFolder
        const outputFolder = path.join(deviceRoot, 'output');
        
        const mergerOpts = {
            outputFolder,
            name: config.mergerName || config.merger_name || path.basename(deviceRoot),
            removeSplits: !!(config.deleteAfterMerge || config.delete_after_merge),
            deleteAfterStabilize: !!(config.deleteAfterStabilize || config.delete_after_stabilize),
            timeGap: config.mergerTimeGap || config.merger_time_gap || 10,
            gyroflowPath: './gyroflow',
            logger: async (msg, type = 'info') => {
                console.log('[WORKER LOGGER] Called with:', type, msg);
                addLog(msg, type);
                socket.emit('log', { timestamp: new Date(), msg, type });
                console.log('[WORKER LOGGER] Emitted log via socket');
            },
            onProgress: (progressData) => {
                // Calculate percentage based on video progress or flight merging progress
                let percent, currentFile, moved, total;
                
                if (progressData.status === 'merging') {
                    // During merge phase
                    percent = Math.round(95 + (progressData.flight / progressData.totalFlights) * 5);
                    currentFile = `Merging flight ${progressData.flight}/${progressData.totalFlights}`;
                    moved = progressData.flight;
                    total = progressData.totalFlights;
                } else if (progressData.totalVideos) {
                    // During stabilization phase
                    percent = Math.round((progressData.video / progressData.totalVideos) * 95);
                    currentFile = progressData.currentFile 
                        ? `${progressData.currentFile} (${progressData.video}/${progressData.totalVideos}${progressData.sizeMB ? `, ${progressData.sizeMB}MB` : ''})`
                        : `Video ${progressData.video}/${progressData.totalVideos}`;
                    moved = progressData.video;
                    total = progressData.totalVideos;
                } else {
                    // Fallback
                    percent = 50;
                    currentFile = `Processing flight ${progressData.flight || 1}`;
                    moved = progressData.flight || 0;
                    total = progressData.totalFlights || 1;
                }
                
                const progressUpdate = {
                    jobId: job.id,
                    uuid,
                    percent,
                    currentFile,
                    moved,
                    total,
                    status: progressData.status === 'stabilizing' ? 'Stabilizing' 
                        : progressData.status === 'processing' ? 'Processing' 
                        : progressData.status === 'merging' ? 'Merging'
                        : progressData.status === 'completed' ? 'Completed'
                        : 'Processing',
                    deviceName: jobName
                };
                
                console.log('[WORKER] Emitting progress:', progressUpdate);
                socket.emit('progress', progressUpdate);
                job.progress(progressUpdate).catch(err => 
                    console.error('[WORKER] Failed to update job progress:', err.message)
                );
            }
        };
        
        socket.emit('log', { timestamp: new Date(), msg: `Starting stabilization for ${jobName}`, type: 'info' });
        const result = await stabilizeAndMergeFolder(inputFolder, mergerOpts);
        
        socket.emit('log', { timestamp: new Date(), msg: `Stabilization complete: ${result.flights} flight(s)`, type: 'info' });
        socket.emit('job_complete', { id: job.id, status: 'Completed', uuid });
        
        // Calculate metrics for history display
        // For stabilization, count the stabilized files created
        let files_moved = 0;
        let total_size = 0;
        const filesList = [];
        
        if (result.outputFolder && await fs.pathExists(result.outputFolder)) {
            const stabilizedFiles = result.stabilizedFiles || [];
            files_moved = stabilizedFiles.length;
            
            for (const fileName of stabilizedFiles) {
                const filePath = path.join(result.outputFolder, fileName);
                if (await fs.pathExists(filePath)) {
                    const stats = await fs.stat(filePath);
                    total_size += stats.size;
                    
                    // Check for thumbnail
                    const thumbName = fileName.replace('.mp4', '_thumb.jpg');
                    const thumbPath = path.join(result.outputFolder, thumbName);
                    const hasThumbnail = await fs.pathExists(thumbPath);
                    
                    filesList.push({
                        path: fileName,
                        size: stats.size,
                        thumbnail: hasThumbnail ? thumbName : null
                    });
                }
            }
        }
        
        // Calculate duration (convert milliseconds to seconds)
        const duration_seconds = job.finishedOn && job.processedOn 
            ? (job.finishedOn - job.processedOn) / 1000 
            : 0;
        
        return {
            success: true,
            uuid,
            device_name: jobName,
            status: 'Completed',
            files_moved,
            total_size,
            duration_seconds,
            flights: result.flights,
            files_json: JSON.stringify(filesList),
            logs_json: JSON.stringify(logs)
        };
    } catch (error) {
        addLog(`Stabilization failed: ${error.message}`, 'error');
        socket.emit('log', { timestamp: new Date(), msg: `Stabilization failed: ${error.message}`, type: 'error' });
        socket.emit('job_complete', { id: job.id, status: 'Failed', uuid });
        throw error;
    }
});

// Queue event handlers
usbQueue.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed successfully:`, result?.status || 'Unknown');
});

usbQueue.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
});

usbQueue.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} is now active`);
});
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM received, closing queue...');
    await usbQueue.close();
    socket.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT received, closing queue...');
    await usbQueue.close();
    socket.disconnect();
    process.exit(0);
});

// Start the worker
initWorker().then(() => {
    console.log('[Worker] Worker is ready and listening for jobs');
}).catch((err) => {
    console.error('[Worker] Failed to initialize:', err);
    process.exit(1);
});
