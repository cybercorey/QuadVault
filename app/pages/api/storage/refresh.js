const { computeStorage, storageCache } = require('../../../lib/storage');
const { emitLog, emitStorage } = require('../../../lib/socket')

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  // Trigger background compute
  try {
    const started = !storageCache.computing;
    // emit server-side log that refresh was requested
    try{ emitLog({ timestamp: new Date(), message: 'Storage refresh requested via API', level: 'info' }) }catch(e){}
    // Always notify clients that a compute is starting/running (computing=true)
    try{ 
      emitStorage({ 
        total: storageCache.data.total, 
        avail: storageCache.data.avail, 
        children: storageCache.data.children, 
        lastUpdated: storageCache.lastUpdated, 
        computing: true 
      }) 
    }catch(e){}
    computeStorage().catch(()=>{});
    res.json({ started, lastUpdated: storageCache.lastUpdated, computing: true });
  } catch(e) { res.status(500).json({error:'failed to refresh'}); }
}
