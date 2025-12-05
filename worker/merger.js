const fs = require('fs-extra');
const path = require('path');
const { execSync, spawn } = require('child_process');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');

const DEFAULT_TIME_GAP = 10; // max seconds gap between footage

// Check if GPU is available for gyroflow
function checkGPUAvailability() {
    try {
        // Check for NVIDIA GPU
        execSync('nvidia-smi', { stdio: 'pipe' });
        return { available: true, type: 'NVIDIA' };
    } catch (e) {
        // No NVIDIA GPU, check for other GPUs via vulkan/opengl
        try {
            execSync('vulkaninfo --summary', { stdio: 'pipe' });
            return { available: true, type: 'Vulkan' };
        } catch (e2) {
            return { available: false, type: 'none' };
        }
    }
}

let gpuWarningShown = false;

async function getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffprobe(filePath, { path: ffprobeStatic.path }, (err, info) => {
            if (err) return reject(err);
            const duration = info.streams[0].duration;
            resolve(parseFloat(duration));
        });
    });
}

async function getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
        ffprobe(filePath, { path: ffprobeStatic.path }, (err, info) => {
            if (err) return reject(err);
            
            const duration = info.streams[0].duration;
            let creationTime = null;
            
            // Try to get creation time from format tags
            if (info.format && info.format.tags) {
                const tags = info.format.tags;
                creationTime = tags.creation_time || tags['com.apple.quicktime.creationdate'] || null;
            }
            
            // If no metadata creation time, fall back to file mtime
            if (!creationTime) {
                const stats = require('fs').statSync(filePath);
                creationTime = stats.mtime.toISOString();
            }
            
            resolve({
                duration: parseFloat(duration),
                creationTime: new Date(creationTime)
            });
        });
    });
}

async function groupVideos(folderPath, timeGap, extraMetadata = false) {
    let flights = [];
    let videoFiles = [];

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
  
    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
    
        if (entry.isDirectory()) {
            const lowerName = entry.name.toLowerCase();
            if (lowerName === 'inital' || lowerName === 'output') continue;
              
            // Recursively group videos inside subdirectories
            const subResults = await groupVideos(fullPath, timeGap, entry.name);
            flights = flights.concat(subResults);
        } else if (
            entry.isFile() &&
            path.extname(entry.name).toLowerCase() === '.mp4' &&
            !entry.name.toLowerCase().includes('stabilized')
        ) {
            videoFiles.push(fullPath);
        }
    }

    // Sort video files by filename to ensure proper order (DJI files are numbered sequentially)
    videoFiles.sort((a, b) => {
        const nameA = path.basename(a);
        const nameB = path.basename(b);
        return nameA.localeCompare(nameB);
    });

    let currentFlight = null;
    let lastEndTime = null;
    let lastFileNumber = null;
    let folderCount = 0;

    for (const filePath of videoFiles) {
        if (!currentFlight) {
            currentFlight = { extraMetadata, filePaths: [], createdTime: null, folderCount };
        }

        try {
            const metadata = await getVideoMetadata(filePath);
            const createdTime = metadata.creationTime;
            const duration = metadata.duration;
            const endTime = new Date(createdTime.getTime() + duration * 1000);
            
            // Extract file number from DJI filename (e.g., DJI_0275.MP4 -> 275)
            const basename = path.basename(filePath, path.extname(filePath));
            const fileNumberMatch = basename.match(/_(\d+)$/);
            const fileNumber = fileNumberMatch ? parseInt(fileNumberMatch[1], 10) : null;
            
            console.log(`[MERGER DEBUG] File: ${path.basename(filePath)}, FileNum: ${fileNumber}, Created: ${createdTime.toISOString()}, Duration: ${duration.toFixed(2)}s`);

            // Set createdTime for flight from first video
            if (!currentFlight.createdTime) {
                currentFlight.createdTime = createdTime;
            }

            // Determine if this should start a new flight based on:
            // 1. Time gap (if metadata is reliable)
            // 2. File number gap (for DJI files with sequential numbering)
            let startNewFlight = false;
            
            if (lastEndTime !== null && createdTime > new Date(lastEndTime.getTime() + timeGap * 1000)) {
                // Time gap detected (only reliable if timestamps are valid)
                const yearValid = createdTime.getFullYear() >= 2020;
                if (yearValid) {
                    startNewFlight = true;
                }
            } else if (lastFileNumber !== null && fileNumber !== null && duration > 30) {
                // For videos longer than 30s, any file number gap likely means a new flight
                // DJI numbers files sequentially, so non-consecutive numbers = separate flights
                if (fileNumber > lastFileNumber + 1) {
                    startNewFlight = true;
                }
            }

            if (startNewFlight) {
                folderCount++;
                flights.push(currentFlight);
                currentFlight = { extraMetadata, filePaths: [filePath], createdTime, folderCount };
            } else {
                currentFlight.filePaths.push(filePath);
            }
            
            lastEndTime = endTime;
            if (fileNumber !== null && duration > 30) {
                lastFileNumber = fileNumber; // Only track numbers from longer videos (>30s)
            }
        } catch (error) {
            console.warn(`Skipping file ${filePath}: ${error.message}`);
        }
    }

    if (currentFlight && currentFlight.filePaths.length > 0) {
        flights.push(currentFlight);
    }

    return flights;
}

async function mergeFlights(flights, baseFolder, outputFolder, opts = {}) {
    const logger = opts.logger || ((m, t = 'info') => console.log(`[${t}] ${m}`));
    const removeSplits = !!opts.removeSplits;
    const name = opts.name || path.basename(baseFolder) || 'flight';
    const mp4MergePath = opts.mp4MergePath || './mp4_merge';
    
    const totalFlights = flights.length;
    let completed = 0;
    const mergeResults = []; // Track all merge operations
    
    for (const flight of flights) {
        completed++;
        const remaining = totalFlights - completed;
        
        logger(`Processing merge ${completed}/${totalFlights} (${remaining} remaining)`);
        
        let firstVideoTime = flight.createdTime;
        
        // If date is clearly invalid (before year 2000), use source file modification time
        if (!firstVideoTime || firstVideoTime.getFullYear() < 2000) {
            try {
                // Get the actual source file's modification time
                const stat = await fs.stat(flight.filePaths[0]);
                firstVideoTime = stat.mtime;
                
                // If mtime is also invalid, try birthtime (creation time)
                if (firstVideoTime.getFullYear() < 2000 && stat.birthtime) {
                    firstVideoTime = stat.birthtime;
                }
                
                // If still invalid, use current date as last resort
                if (firstVideoTime.getFullYear() < 2000) {
                    firstVideoTime = new Date();
                    logger(`Warning: Using current date for ${path.basename(flight.filePaths[0])} (no valid timestamps found)`, 'warn');
                }
            } catch (e) {
                firstVideoTime = new Date(); // Fallback to current date
                logger(`Warning: Error reading file stats, using current date: ${e.message}`, 'warn');
            }
        }
        
        let formattedTime = firstVideoTime.toISOString().replace(/[:.-]/g, '');
        let newTime = firstVideoTime;

        const folderCount = flight.folderCount;
        let baseOutputFile = path.join(outputFolder, `${name}_${formattedTime}_${folderCount}.mp4`);
        let outputFile = baseOutputFile;

        // Pull time from file name (DJI format: DJI_YYYYMMDDHHmmss_)
        const filename = path.basename(flight.filePaths[0]);
        const match = filename.match(/^DJI_(\d{14})_/);

        if (match) {
            const ts = match[1];
            const isoString = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}`;
            const checkTime = new Date(isoString);

            if (!isNaN(checkTime.getTime())) {
                newTime = checkTime;
                formattedTime = checkTime.toISOString().replace(/[:.-]/g, '');
                outputFile = path.join(outputFolder, `${name}_${formattedTime}_${folderCount}.mp4`);
            }
        }

        // Pull time from extra metadata (folder name mapping)
        if (flight.extraMetadata) {
            const folderMatch = flight.extraMetadata
                .replace('_', ' ')
                .match(/(\d+)-(\d+)-(\d+)\s+(\d+)-(\d+)-(\d+)\s+(am|pm)/i);
            
            if (folderMatch) {
                const [, d, m, y, h, min, s, ampm] = folderMatch;
                let hour = +h;
                if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
                if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
        
                const parsedDate = new Date(Date.UTC(+y, +m - 1, +d, hour, +min, +s));

                if (!isNaN(parsedDate.getTime())) {
                    newTime = parsedDate;
                    formattedTime = parsedDate.toISOString().replace(/[:.-]/g, '');
                    outputFile = path.join(outputFolder, `${name}_${formattedTime}_${folderCount}.mp4`);
                }
            }
        }
        
        // Pull time from base folder path (worker timestamp format: YYYY-MM-DD_HH-mm-ss)
        // e.g., /mnt/network_share/goggles/2025-12-03_19-34-46/
        const baseFolderName = path.basename(baseFolder);
        const timestampMatch = baseFolderName.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
        
        if (timestampMatch && firstVideoTime.getFullYear() < 2000) {
            const [, year, month, day, hour, min, sec] = timestampMatch;
            const folderDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
            
            if (!isNaN(folderDate.getTime()) && folderDate.getFullYear() >= 2000) {
                newTime = folderDate;
                formattedTime = folderDate.toISOString().replace(/[:.-]/g, '');
                outputFile = path.join(outputFolder, `${name}_${formattedTime}_${folderCount}.mp4`);
                logger(`Using folder timestamp: ${folderDate.toISOString()}`);
            }
        }

        // Skip if output already exists
        if (await fs.pathExists(outputFile)) {
            logger(`Output already exists, skipping: ${path.basename(outputFile)}`);
            continue;
        }

        logger(`Merging ${flight.filePaths.length} files into ${path.basename(outputFile)}`);

        // Merge using mp4_merge binary
        const inputFiles = flight.filePaths.map(f => `"${f}"`).join(' ');
        const mergeCmd = `${mp4MergePath} ${inputFiles} --out "${outputFile}"`;
        
        const inputFileNames = flight.filePaths.map(f => path.basename(f));
        
        try {
            execSync(mergeCmd, { stdio: 'pipe' });
            logger(`Successfully merged into ${path.basename(outputFile)}`);
            
            // Record merge result
            mergeResults.push({
                output: path.basename(outputFile),
                inputs: inputFileNames,
                removed: removeSplits ? inputFileNames : []
            });
        } catch (err) {
            logger(`Merge failed: ${err.message}`, 'error');
            throw err;
        }

        // Set file timestamps to match original video creation time
        // Convert Date object to Unix timestamp (seconds)
        const timestamp = newTime.getTime() / 1000;
        await fs.utimes(outputFile, timestamp, timestamp);
        logger(`Set file timestamps to ${newTime.toISOString()}`);

        // Optionally remove split files
        if (removeSplits) {
            for (const p of flight.filePaths) {
                try {
                    if (await fs.pathExists(p)) {
                        await fs.remove(p);
                        logger(`Removed split file ${path.basename(p)}`);
                        
                        // Also remove associated thumbnail
                        const ext = path.extname(p);
                        const thumbPath = p.replace(ext, '_thumb.jpg');
                        if (await fs.pathExists(thumbPath)) {
                            await fs.remove(thumbPath);
                            logger(`Removed thumbnail ${path.basename(thumbPath)}`);
                        }
                    }
                } catch (e) {
                    logger(`Failed to remove ${path.basename(p)}: ${e.message}`, 'warn');
                }
            }
        }
    }
    
    return mergeResults;
}

/**
 * Merge DJI split video files in a folder
 * @param {string} baseFolder - Source folder to scan for videos
 * @param {object} opts - Options
 * @param {string} opts.outputFolder - Custom output folder (default: baseFolder/output)
 * @param {string} opts.name - Name prefix for merged files
 * @param {function} opts.logger - Logger function (msg, type)
 * @param {boolean} opts.removeSplits - Delete original split files after merge
 * @param {number} opts.timeGap - Max gap between videos in seconds (default: 10)
 * @param {string} opts.mp4MergePath - Path to mp4_merge binary
 */
async function mergeFolder(baseFolder, opts = {}) {
    const outputFolder = opts.outputFolder || path.join(baseFolder, 'output');
    const name = opts.name || path.basename(baseFolder) || 'flight';
    const logger = opts.logger || ((m, t = 'info') => console.log(`[${t}] ${m}`));
    const timeGap = typeof opts.timeGap === 'number' ? opts.timeGap : DEFAULT_TIME_GAP;

    logger(`Scanning ${baseFolder} for mp4 files to merge (gap=${timeGap}s)`);
    
    await fs.ensureDir(outputFolder);

    const flights = await groupVideos(baseFolder, timeGap, false);
    logger(`Found ${flights.length} candidate flight(s)`);
    
    const mergeResults = await mergeFlights(flights, baseFolder, outputFolder, { ...opts, name, logger });
    
    return { flights: flights.length, outputFolder, merges: mergeResults };
}

/**
 * Stabilize and merge DJI split video files in a folder using gyroflow binary
 * @param {string} baseFolder - Source folder to scan for videos
 * @param {object} opts - Options (same as mergeFolder)
 */
async function stabilizeAndMergeFolder(baseFolder, opts = {}) {
    console.log('[MERGER] stabilizeAndMergeFolder called for:', baseFolder);
    const outputFolder = opts.outputFolder || path.join(baseFolder, 'output');
    const name = opts.name || path.basename(baseFolder) || 'flight';
    const originalLogger = opts.logger || ((m, t = 'info') => console.log(`[${t}] ${m}`));
    const progressCallback = opts.onProgress || (() => {});
    const deleteAfterStabilize = !!opts.deleteAfterStabilize;
    console.log('[MERGER] Logger type:', typeof originalLogger);
    // Wrap logger to handle both sync and async loggers WITHOUT blocking
    const logger = (msg, type = 'info') => {
        console.log('[MERGER LOG]', type, ':', msg);
        const result = originalLogger(msg, type);
        // Fire and forget - don't await async loggers
        if (result && typeof result.then === 'function') {
            result.catch(err => console.error('Logger error:', err.message));
        }
    };
    const timeGap = typeof opts.timeGap === 'number' ? opts.timeGap : DEFAULT_TIME_GAP;
    const gyroflowPath = opts.gyroflowPath || './gyroflow';

    console.log('[MERGER] About to check GPU...');
    // Check GPU availability and warn if not available
    if (!gpuWarningShown) {
        const gpu = checkGPUAvailability();
        console.log('[MERGER] GPU check result:', gpu);
        if (!gpu.available) {
            logger('⚠️  WARNING: No GPU detected! Gyroflow stabilization requires GPU acceleration.', 'warn');
            logger('⚠️  GPU passthrough is required for Docker. See README for setup instructions.', 'warn');
            logger('⚠️  Stabilization will likely fail without GPU support.', 'warn');
        } else {
            logger(`✓ GPU detected: ${gpu.type}`, 'info');
        }
        gpuWarningShown = true;
    }

    logger(`Scanning ${baseFolder} for mp4 files to stabilize and merge (gap=${timeGap}s)`);
    
    await fs.ensureDir(outputFolder);

    // Check if we're working with already-merged files (baseFolder is output folder)
    const isOutputFolder = path.basename(baseFolder) === 'output';
    
    const flights = await groupVideos(baseFolder, timeGap, false);
    logger(`Found ${flights.length} candidate flight(s) for stabilization`);
    
    // If working with pre-merged files from output folder, only stabilize those
    if (isOutputFolder) {
        logger(`Working with pre-merged files - stabilizing merged outputs directly`);
        
        // Get list of MP4 files in output folder directly (don't re-group)
        const entries = await fs.readdir(baseFolder, { withFileTypes: true });
        const videoFiles = entries
            .filter(e => e.isFile() && path.extname(e.name).toLowerCase() === '.mp4' && !e.name.toLowerCase().includes('_stab'))
            .map(e => path.join(baseFolder, e.name))
            .sort();
        
        const totalVideos = videoFiles.length;
        let processedVideos = 0;
        const stabilizedFiles = [];
        
        for (const videoPath of videoFiles) {
            const videoName = path.basename(videoPath, path.extname(videoPath));
            // Don't add _stab if already has it
            const stabilizedPath = videoName.endsWith('_stab') 
                ? videoPath 
                : path.join(outputFolder, `${videoName}_stab.mp4`);
            
            // Skip if already stabilized
            if (await fs.pathExists(stabilizedPath)) {
                logger(`Already stabilized: ${path.basename(stabilizedPath)}`);
                processedVideos++;
                stabilizedFiles.push(path.basename(stabilizedPath));
                continue;
            }
            
            processedVideos++;
            try {
                logger(`Stabilizing ${path.basename(videoPath)}...`);
                progressCallback({ 
                    video: processedVideos, 
                    totalVideos: totalVideos,
                    status: 'stabilizing',
                currentFile: path.basename(videoPath)
                });
                
                const outParams = `{ 'codec': 'H.264/AVC', 'bitrate': 50, 'use_gpu': true, 'audio': true, 'output_path': '${stabilizedPath}' }`;
                const syncParams = `{ 'search_size': 3 }`;
                const gyroflowCmd = `${gyroflowPath} "${videoPath}" --out-params "${outParams}" --sync-params "${syncParams}" --overwrite`;
                
                logger(`  → Loading video and detecting camera...`);
                
                await new Promise((resolve, reject) => {
                    const gyroProcess = spawn('/bin/sh', ['-c', gyroflowCmd], {
                        env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' }
                    });
                    
                    let stderr = '';
                    let stdout = '';
                    
                    const progressInterval = setInterval(async () => {
                        try {
                            if (fs.existsSync(stabilizedPath)) {
                                const stats = fs.statSync(stabilizedPath);
                                const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
                                logger(`  → Processing... (${sizeMB} MB written)`);
                            }
                        } catch (e) {}
                    }, 10000);
                    
                    gyroProcess.stdout.on('data', (data) => {
                        stdout += data.toString();
                        const lines = data.toString().trim().split('\n');
                        lines.forEach(line => {
                            if (line.includes('%') || line.includes('Processing') || line.includes('Rendering')) {
                                logger(`  → ${line.trim()}`);
                            }
                        });
                    });
                    
                    gyroProcess.stderr.on('data', (data) => {
                        stderr += data.toString();
                    });
                    
                    gyroProcess.on('close', (code) => {
                        clearInterval(progressInterval);
                        if (code === 0) {
                            resolve();
                        } else {
                            const error = new Error(`Gyroflow failed with code ${code}`);
                            error.stderr = stderr;
                            error.stdout = stdout;
                            reject(error);
                        }
                    });
                    
                    gyroProcess.on('error', (err) => {
                        clearInterval(progressInterval);
                        reject(err);
                    });
                });
                
                logger(`  ✓ Stabilized: ${path.basename(stabilizedPath)}`);
                stabilizedFiles.push(path.basename(stabilizedPath));
                
                // Delete the original merged file if requested
                if (deleteAfterStabilize && videoPath !== stabilizedPath) {
                    try {
                        await fs.remove(videoPath);
                        logger(`  → Deleted merged file: ${path.basename(videoPath)}`);
                    } catch (err) {
                        logger(`  ⚠ Failed to delete merged file: ${err.message}`, 'warn');
                    }
                }
            } catch (error) {
                logger(`  ✗ Stabilization failed for ${path.basename(videoPath)}: ${error.message}`, 'error');
                throw error;
            }
        }
        
        return { flights: totalVideos, outputFolder, merges: [], stabilizedFiles };
    }
    
    // Count total videos for progress tracking
    const totalVideos = flights.reduce((sum, f) => sum + f.filePaths.length, 0);
    let processedVideos = 0;
    
    // Stabilize each video individually (original workflow)
    for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        logger(`Processing flight ${i + 1}/${flights.length} (${flight.filePaths.length} video(s))`);
        
        for (const videoPath of flight.filePaths) {
            processedVideos++;
            const videoName = path.basename(videoPath, path.extname(videoPath));
            const stabilizedPath = path.join(outputFolder, `${videoName}_stab.mp4`);
            
            // Skip if already stabilized
            if (await fs.pathExists(stabilizedPath)) {
                logger(`[${processedVideos}/${totalVideos}] Already stabilized: ${path.basename(stabilizedPath)}`);
                progressCallback({ 
                    video: processedVideos, 
                    totalVideos, 
                    flight: i + 1,
                    totalFlights: flights.length,
                    status: 'skipped' 
                });
                continue;
            }
            
            try {
                logger(`[${processedVideos}/${totalVideos}] Stabilizing ${path.basename(videoPath)}...`);
                progressCallback({ 
                    video: processedVideos, 
                    totalVideos,
                    flight: i + 1,
                    totalFlights: flights.length, 
                    status: 'stabilizing',
                    currentFile: path.basename(videoPath)
                });
                
                // Gyroflow uses TOML-style syntax for parameters (single quotes for keys/strings)
                const outParams = `{ 'codec': 'H.264/AVC', 'bitrate': 50, 'use_gpu': true, 'audio': true, 'output_path': '${stabilizedPath}' }`;
                const syncParams = `{ 'search_size': 3 }`;
                const gyroflowCmd = `${gyroflowPath} "${videoPath}" --out-params "${outParams}" --sync-params "${syncParams}" --overwrite`;
                
                logger(`  → Loading video and detecting camera...`);
                
                // Use spawn to stream gyroflow output in real-time
                await new Promise((resolve, reject) => {
                    const gyroProcess = spawn('/bin/sh', ['-c', gyroflowCmd], {
                        env: {
                            ...process.env,
                            QT_QPA_PLATFORM: 'offscreen'
                        }
                    });
                    
                    let stderr = '';
                    let stdout = '';
                    
                    // Monitor output file size for progress indication
                    const progressInterval = setInterval(async () => {
                        try {
                            if (fs.existsSync(stabilizedPath)) {
                                const stats = fs.statSync(stabilizedPath);
                                const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
                                logger(`  → Processing... (${sizeMB} MB written)`);
                                progressCallback({ 
                                    video: processedVideos, 
                                    totalVideos,
                                    flight: i + 1,
                                    totalFlights: flights.length,
                                    status: 'processing', 
                                    sizeMB: parseFloat(sizeMB),
                                    currentFile: path.basename(videoPath)
                                });
                            }
                        } catch (e) {
                            // Ignore errors during progress check
                        }
                    }, 10000);
                    
                    gyroProcess.stdout.on('data', (data) => {
                        stdout += data.toString();
                        const lines = data.toString().trim().split('\n');
                        lines.forEach(line => {
                            if (line.includes('%') || line.includes('Processing') || line.includes('Rendering')) {
                                logger(`  → ${line.trim()}`);
                            }
                        });
                    });
                    
                    gyroProcess.stderr.on('data', (data) => {
                        stderr += data.toString();
                        const lines = data.toString().trim().split('\n');
                        lines.forEach(line => {
                            if (line.includes('[ERROR]') || line.includes('error:')) {
                                logger(`  ! ${line.trim()}`, 'warn');
                            }
                        });
                    });
                    
                    gyroProcess.on('close', (code) => {
                        clearInterval(progressInterval);
                        if (code === 0) {
                            resolve();
                        } else {
                            const error = new Error(`Gyroflow failed with code ${code}`);
                            error.stderr = stderr;
                            error.stdout = stdout;
                            reject(error);
                        }
                    });
                    
                    gyroProcess.on('error', (err) => {
                        clearInterval(progressInterval);
                        reject(err);
                    });
                });
                
                logger(`  ✓ Stabilized: ${path.basename(stabilizedPath)}`);
        } catch (error) {
            // Log the full error output from gyroflow
            const stderr = error.stderr ? error.stderr.toString() : '';
            const stdout = error.stdout ? error.stdout.toString() : '';
            
            // Extract key error messages
            const errorLines = stderr.split('\n').filter(l => l.includes('[ERROR]'));
            if (errorLines.length > 0) {
                logger(`  ✗ Gyroflow errors:`, 'error');
                errorLines.forEach(line => logger(`    ${line.trim()}`, 'error'));
            }
            
            // Check for specific error conditions
            if (stderr.includes('No GPU') || stderr.includes('wgpu init error') || stderr.includes('OpenCL')) {
                logger(`  ✗ GPU Error: Gyroflow requires GPU acceleration. Enable GPU passthrough in Docker.`, 'error');
            } else if (stderr.includes('No lens profile')) {
                logger(`  ✗ Camera Error: No lens profile found for this camera model.`, 'error');
            } else {
                logger(`  ✗ Stabilization failed: ${error.message}`, 'error');
            }
            
                throw error;
            }
        }
    }
    
    // After stabilization, merge the stabilized files per flight
    // Skip merging if we're already working with merged files from output folder
    if (!isOutputFolder && flights.length > 0) {
        logger(`Merging ${flights.length} stabilized flight(s)...`);
        
        for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        const stabilizedFiles = [];
        
        // Collect stabilized files for this flight
        for (const videoPath of flight.filePaths) {
            const videoName = path.basename(videoPath, path.extname(videoPath));
            const stabilizedPath = path.join(outputFolder, `${videoName}_stab.mp4`);
            if (await fs.pathExists(stabilizedPath)) {
                stabilizedFiles.push(stabilizedPath);
            }
        }
        
        if (stabilizedFiles.length === 0) {
            logger(`No stabilized files found for flight ${i + 1}, skipping merge`, 'warn');
            continue;
        }
        
        // Generate output filename with _stab suffix
        const outputFile = path.join(outputFolder, `${name}_flight_${i + 1}_stab.mp4`);
        
        if (await fs.pathExists(outputFile)) {
            logger(`Merged output already exists: ${path.basename(outputFile)}`);
            continue;
        }
        
        if (stabilizedFiles.length === 1) {
            // Just rename the single stabilized file
            await fs.rename(stabilizedFiles[0], outputFile);
            logger(`Renamed single stabilized video to ${path.basename(outputFile)}`);
        } else {
            // Merge multiple stabilized files using ffmpeg concat
            logger(`Merging ${stabilizedFiles.length} stabilized files for flight ${i + 1}...`);
            progressCallback({ 
                flight: i + 1,
                totalFlights: flights.length,
                status: 'merging',
                files: stabilizedFiles.length
            });
            
            const tempList = path.join(outputFolder, `concat_${i}.txt`);
            const listContent = stabilizedFiles.map(f => `file '${f}'`).join('\n');
            await fs.writeFile(tempList, listContent);
            
            try {
                execSync(
                    `ffmpeg -f concat -safe 0 -i "${tempList}" -c copy "${outputFile}" -y`,
                    { stdio: 'pipe' }
                );
                logger(`✓ Merged flight ${i + 1}: ${path.basename(outputFile)}`);
                
                // Remove temp list
                await fs.remove(tempList);
                
                // Optionally remove individual stabilized files if requested
                if (opts.removeSplits) {
                    for (const sf of stabilizedFiles) {
                        await fs.remove(sf);
                        logger(`Removed individual stabilized file: ${path.basename(sf)}`);
                    }
                }
            } catch (error) {
                logger(`Merge failed for flight ${i + 1}: ${error.message}`, 'error');
                if (await fs.pathExists(tempList)) await fs.remove(tempList);
                throw error;
            }
        }
        
        progressCallback({ 
            flight: i + 1,
            totalFlights: flights.length,
            status: 'completed',
            output: path.basename(outputFile)
        });
    }
    } else if (isOutputFolder) {
        logger(`Skipping merge step - stabilizing pre-merged files from output folder`);
    }
    
    return { flights: flights.length, outputFolder };
}

module.exports = { mergeFolder, stabilizeAndMergeFolder };
