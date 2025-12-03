const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');

const DEFAULT_TIME_GAP = 10; // max seconds gap between footage

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
        
        // If date is clearly invalid (before year 2000), use file modification time
        if (firstVideoTime.getFullYear() < 2000) {
            try {
                const stat = await fs.stat(flight.filePaths[0]);
                firstVideoTime = stat.mtime;
            } catch (e) {
                firstVideoTime = new Date(); // Fallback to current date
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

module.exports = { mergeFolder };
