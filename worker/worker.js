const Queue = require('bull');
const io = require('socket.io-client');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Import shared libraries from frontend (mounted as volume)
const { computeStorage, DEST_ROOT } = require('/app/lib/storage');
const { mergeFolder } = require('/app/lib/merger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MOUNT_POINT = process.env.MOUNT_POINT || '/mnt/usb_incoming';

console.log('[Worker] Starting USB Automator Worker...');
console.log('[Worker] Redis URL:', REDIS_URL);
console.log('[Worker] Frontend URL:', FRONTEND_URL);

// Connect to frontend's Socket.io server to emit progress updates
const socket = io(FRONTEND_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

socket.on('connect', () => {
    console.log('[Worker] Connected to frontend Socket.io server');
});

socket.on('disconnect', () => {
    console.log('[Worker] Disconnected from frontend Socket.io server');
});

socket.on('connect_error', (error) => {
    console.error('[Worker] Socket.io connection error:', error.message);
});

// Create Bull queue worker
const usbQueue = new Queue('usb-jobs', REDIS_URL);

console.log('[Worker] Queue configured, waiting for jobs...');

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
            
            return {
                success: true,
                uuid,
                device_name: jobName,
                status: 'Nothing to do',
                files_moved: 0,
                total_size: 0,
                duration_seconds: duration,
                files_json: JSON.stringify([]),
                logs_json: JSON.stringify(logs),
                merge_json: JSON.stringify([])
            };
        }

        let moved=0;
        const dryRun = !!(config.dryRun || config.dry_run);
        for(const f of files){
            const rel = path.relative(srcDir, f.path);
            const dest = path.join(targetDir, rel);
            await fs.ensureDir(path.dirname(dest));
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
            
            processedFiles.push({ 
                path: rel, 
                size: f.size,
                date: fileDate.toISOString()
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
        socket.emit('log', { timestamp: new Date(), msg: `Complete for ${jobName} in ${duration}s.`, type:'info' });
        socket.emit('job_complete', { id: job.id, status: 'Completed', uuid });
        
        // Trigger merger if enabled
        const mergerEnabled = !!(config.mergerEnabled || config.merger_enabled);
        if (mergerEnabled) {
            const deviceRoot = path.join(DEST_ROOT, outFolder);
            const outputFolder = path.join(deviceRoot, 'output');
            const mergerOpts = {
                outputFolder,
                name: config.mergerName || config.merger_name || outFolder,
                removeSplits: !!(config.deleteAfterMerge || config.delete_after_merge),
                timeGap: config.mergerTimeGap || config.merger_time_gap || 10,
                mp4MergePath: path.join(process.cwd(), 'mp4_merge'),
                logger: (msg, type = 'info') => {
                    addLog(msg, type);
                    socket.emit('log', { timestamp: new Date(), msg, type });
                }
            };
            
            try {
                const progressData = { jobId: job.id, uuid, percent: 0, currentFile: 'Starting merge...', moved: 0, total: 0, status: 'Merging', deviceName: jobName };
                socket.emit('progress', progressData);
                await job.progress(progressData);
                
                addLog(`[Merge Job] Starting merge process`);
                addLog(`[Merge Job] Source: ${targetDir}`);
                addLog(`[Merge Job] Output: ${outputFolder}`);
                socket.emit('log', { timestamp: new Date(), msg: `Starting video merge for ${jobName}`, type: 'info' });
                
                let currentMerge = 0;
                let totalMerges = 0;
                
                const mergeLoggerWithProgress = async (msg, type = 'info') => {
                    addLog(msg, type);
                    socket.emit('log', { timestamp: new Date(), msg, type });
                    
                    const progressMatch = msg.match(/Processing merge (\d+)\/(\d+)/);
                    if (progressMatch) {
                        currentMerge = parseInt(progressMatch[1]);
                        totalMerges = parseInt(progressMatch[2]);
                        const percent = Math.round((currentMerge / totalMerges) * 100);
                        const progressData = { 
                            jobId: job.id,
                            uuid, 
                            percent, 
                            currentFile: `Merging flight ${currentMerge}/${totalMerges}`, 
                            moved: currentMerge, 
                            total: totalMerges, 
                            status: 'Merging',
                            deviceName: jobName
                        };
                        socket.emit('progress', progressData);
                        await job.progress(progressData);
                    }
                };
                
                const result = await mergeFolder(targetDir, { ...mergerOpts, logger: mergeLoggerWithProgress });
                
                if (result.merges && result.merges.length > 0) {
                    merges = result.merges;
                }
                
                addLog(`[Merge Job] Completed: ${result.flights} flight(s) processed`);
                socket.emit('log', { timestamp: new Date(), msg: `Merge complete: ${result.flights} flight(s)`, type: 'info' });
                socket.emit('job_complete', { id: job.id, status: 'Completed', uuid });
            } catch (error) {
                addLog(`[Merge Job] Failed: ${error.message}`, 'error');
                socket.emit('log', { timestamp: new Date(), msg: `Merge failed: ${error.message}`, type: 'error' });
                socket.emit('job_complete', { id: job.id, status: 'Merge Failed', uuid });
                
                // Return partial success with merge error
                return {
                    success: true,
                    uuid,
                    device_name: jobName,
                    status: 'Merge Failed',
                    files_moved: moved,
                    total_size: totalSize,
                    duration_seconds: Math.round((Date.now() - startTs) / 1000),
                    files_json: JSON.stringify(processedFiles),
                    logs_json: JSON.stringify(logs),
                    merge_json: JSON.stringify(merges)
                };
            }
        }
        
        socket.emit('job_complete', { id: job.id, status: 'Completed', uuid });
        computeStorage().catch(()=>{});
        
        // Return all job data to be stored in Bull job
        return {
            success: true,
            uuid,
            device_name: jobName,
            status: 'Completed',
            files_moved: moved,
            total_size: totalSize,
            duration_seconds: duration,
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

// Process sync-device jobs
usbQueue.process('sync-device', async (job) => {
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

console.log('[Worker] Worker is ready and listening for jobs');
