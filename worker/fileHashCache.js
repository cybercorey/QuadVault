const fs = require('fs-extra');
const crypto = require('crypto');

const HASH_CACHE_FILE = '/app/file-hash-cache.json';

// Simple XXHash simulation using size + mtime (would use real xxhash package in production)
function xxhashSimple(data) {
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 16);
}

// Calculate file hash based on algorithm
async function calculateHash(filePath, algorithm = 'xxhash') {
  const stats = await fs.stat(filePath);
  
  // Fast mode: just use size + mtime
  if (algorithm === 'xxhash') {
    // Simulate xxhash with size+mtime (much faster than reading file)
    const data = `${stats.size}-${stats.mtimeMs}`;
    return xxhashSimple(data);
  }
  
  // Full hash modes (slower but accurate)
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm === 'sha256' ? 'sha256' : 'md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Load hash cache from disk
async function loadCache() {
  try {
    if (await fs.pathExists(HASH_CACHE_FILE)) {
      return await fs.readJson(HASH_CACHE_FILE);
    }
  } catch (err) {
    console.error('[Hash Cache] Failed to load:', err.message);
  }
  return { files: {}, lastCleanup: Date.now() };
}

// Save hash cache to disk
async function saveCache(cache) {
  try {
    await fs.writeJson(HASH_CACHE_FILE, cache, { spaces: 2 });
  } catch (err) {
    console.error('[Hash Cache] Failed to save:', err.message);
  }
}

// Get cached hash for file
async function getCachedHash(filePath, cache) {
  const entry = cache.files[filePath];
  if (!entry) return null;
  
  try {
    const stats = await fs.stat(filePath);
    
    // Check if file has been modified
    if (entry.size === stats.size && entry.mtime === stats.mtimeMs) {
      return entry.hash;
    }
  } catch (err) {
    // File doesn't exist or can't be read
    return null;
  }
  
  return null;
}

// Set hash in cache
function setCachedHash(filePath, hash, stats, cache) {
  cache.files[filePath] = {
    hash,
    size: stats.size,
    mtime: stats.mtimeMs,
    lastCheck: Date.now()
  };
}

// Check if file needs to be copied
async function shouldCopyFile(sourcePath, destPath, settings) {
  const incrementalSettings = settings.incremental_sync || {};
  
  if (!incrementalSettings.enabled) {
    // Incremental sync disabled, always copy
    return { shouldCopy: true, reason: 'incremental_disabled' };
  }
  
  // Check if destination exists
  if (!await fs.pathExists(destPath)) {
    return { shouldCopy: true, reason: 'dest_not_found' };
  }
  
  const sourceStats = await fs.stat(sourcePath);
  const destStats = await fs.stat(destPath);
  
  // Fast mode: just compare size
  if (incrementalSettings.verify_size_only) {
    if (sourceStats.size !== destStats.size) {
      return { shouldCopy: true, reason: 'size_mismatch' };
    }
    return { shouldCopy: false, reason: 'size_match' };
  }
  
  // Full mode: compare hashes
  const cache = await loadCache();
  const algorithm = incrementalSettings.hash_algorithm || 'xxhash';
  
  // Get or calculate source hash
  let sourceHash = await getCachedHash(sourcePath, cache);
  if (!sourceHash) {
    sourceHash = await calculateHash(sourcePath, algorithm);
    setCachedHash(sourcePath, sourceHash, sourceStats, cache);
  }
  
  // Get or calculate dest hash
  let destHash = await getCachedHash(destPath, cache);
  if (!destHash) {
    destHash = await calculateHash(destPath, algorithm);
    setCachedHash(destPath, destHash, destStats, cache);
  }
  
  // Save updated cache
  await saveCache(cache);
  
  if (sourceHash !== destHash) {
    return { shouldCopy: true, reason: 'hash_mismatch', sourceHash, destHash };
  }
  
  return { shouldCopy: false, reason: 'hash_match', hash: sourceHash };
}

// Clean up expired cache entries
async function cleanupCache(settings) {
  const cache = await loadCache();
  const expiryMs = (settings.incremental_sync?.cache_expiry_days || 30) * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - expiryMs;
  
  let removed = 0;
  for (const [filePath, entry] of Object.entries(cache.files)) {
    if (entry.lastCheck < cutoff) {
      delete cache.files[filePath];
      removed++;
    }
  }
  
  cache.lastCleanup = Date.now();
  await saveCache(cache);
  
  console.log(`[Hash Cache] Cleanup complete: removed ${removed} expired entries`);
  return removed;
}

module.exports = {
  calculateHash,
  shouldCopyFile,
  cleanupCache,
  loadCache,
  saveCache
};
