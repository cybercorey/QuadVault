const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { emitLog, emitStorage } = require('./socket');

const DEST_ROOT = process.env.DEST_ROOT || process.env.DEST || '/mnt/network_share';
const STORAGE_CACHE_FILE = '/app/storage-cache.json';

const storageCache = {
    data: { total: null, avail: null, children: [] },
    lastUpdated: 0,
    computing: false
};

function computeStorage() {
    if (storageCache.computing) return Promise.resolve(storageCache.data);
    storageCache.computing = true;
    return new Promise((resolve) => {
        (async () => {
            try {
                if (!fs.existsSync(DEST_ROOT)) {
                    storageCache.data = { total: null, avail: null, children: [] };
                    storageCache.lastUpdated = Date.now();
                    storageCache.computing = false;
                    return resolve(storageCache.data);
                }

                let total = null, avail = null;
                try {
                    const dfOut = await new Promise((res, rej) => exec(`df -B1 --output=size,avail ${DEST_ROOT} | tail -n 1`, (err, stdout)=> err ? rej(err) : res(stdout)));
                    const parts = dfOut.toString().trim().split(/\s+/);
                    total = parseInt(parts[0] || '0', 10);
                    avail = parseInt(parts[1] || '0', 10);
                } catch (e) {
                    try {
                        const dfOut2 = await new Promise((res, rej) => exec(`df --output=size,avail -k ${DEST_ROOT} | tail -n 1`, (err, stdout) => err ? rej(err) : res(stdout)));
                        const parts = dfOut2.toString().trim().split(/\s+/);
                        total = (parseInt(parts[0] || '0', 10) * 1024) || 0;
                        avail = (parseInt(parts[1] || '0', 10) * 1024) || 0;
                    } catch (e2) {
                        total = null; avail = null;
                    }
                }

                let children = [];
                try {
                    const duCmd = `du -sb ${DEST_ROOT}/* 2>/dev/null | awk '{print $1" "$2}'`;
                    const duOut = await new Promise((res, rej) => exec(duCmd, (err, stdout) => err ? rej(err) : res(stdout)));
                    const lines = duOut.toString().trim().split(/\n/).filter(l => l.trim());
                    for (const ln of lines) {
                        const parts = ln.trim().split(/\s+/);
                        if (parts.length < 2) continue;
                        const size = parseInt(parts[0] || '0', 10);
                        const p = parts.slice(1).join(' ');
                        const name = path.basename(p);
                        children.push({ name, used: size });
                    }
                } catch (e) {
                    try {
                        const names = fs.readdirSync(DEST_ROOT, { withFileTypes: true });
                        for (const d of names) {
                            if (!d.isDirectory()) continue;
                            children.push({ name: d.name, used: null });
                        }
                    } catch (e2) { children = []; }
                }

                storageCache.data = { total, avail, children };
                storageCache.lastUpdated = Date.now();
                storageCache.computing = false;
                
                try{ emitStorage({ total, avail, children, lastUpdated: storageCache.lastUpdated, computing: false }) }catch(e){}
                emitLog({ timestamp: new Date(), msg: `Storage cache updated: total=${total}, avail=${avail}`, type: 'info' });

                // Save to JSON file
                try {
                    await fs.writeJson(STORAGE_CACHE_FILE, {
                        total,
                        avail,
                        children: children || [],
                        lastUpdated: storageCache.lastUpdated
                    }, { spaces: 2 });
                } catch (e) { 
                    console.error('[storage] Failed to save cache:', e);
                }
            } catch (err) {
                storageCache.lastUpdated = Date.now();
                storageCache.computing = false;
                
                // Save error state to JSON file
                try {
                    await fs.writeJson(STORAGE_CACHE_FILE, {
                        total: storageCache.data.total,
                        avail: storageCache.data.avail,
                        children: storageCache.data.children || [],
                        lastUpdated: storageCache.lastUpdated
                    }, { spaces: 2 });
                } catch (e) { /* ignore */ }
                
                try{ emitStorage({ ...storageCache.data, lastUpdated: storageCache.lastUpdated, computing: false }) }catch(e){}
            } finally {
                storageCache.computing = false;
                resolve(storageCache.data);
            }
        })();
    });
}

async function loadPersisted(){
    try {
        const cached = await fs.readJson(STORAGE_CACHE_FILE);
        if (cached) {
            storageCache.data.total = cached.total;
            storageCache.data.avail = cached.avail;
            storageCache.data.children = cached.children || [];
            storageCache.lastUpdated = cached.lastUpdated || 0;
        }
    } catch (e) { 
        console.log('[storage] No persisted cache found, will compute fresh');
    }
}

module.exports = { storageCache, computeStorage, loadPersisted, DEST_ROOT };
