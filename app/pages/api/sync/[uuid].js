const { execSync } = require('child_process');
const fs = require('fs-extra');
const { emitLog, emitJobQueued } = require('../../../lib/socket')
const usbQueue = require('../../../lib/bullQueue');

const CONFIG_FILE = '/app/config.json';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  
  const uuid = req.query.uuid;
  
  try {
    // Get device config from JSON file
    const configData = await fs.readJson(CONFIG_FILE);
    const device = configData.devices.find(d => d.uuid === uuid);
    
    if (!device) {
      try{ emitLog({ timestamp: new Date(), message: `Sync requested for unknown device ${uuid}`, level: 'warn' }) }catch(e){}
      return res.status(404).json({error: 'Unknown Device'});
    }
    
    const devPath = execSync(`findfs UUID=${uuid}`).toString().trim();
    const node = devPath.split('/').pop();
    
    // Add to Bull queue - worker will pick it up
    const job = await usbQueue.add('sync-device', {
      deviceNode: node,
      uuid,
      config: device,
      jobType: 'sync'
    }, {
      jobId: `sync-${uuid}-${Date.now()}`,
      priority: 1
    });
    
    emitLog({ timestamp: new Date(), msg: `Sync job queued for ${device.friendlyName || device.outputPath} (Job ID: ${job.id})`, type: 'info' });
    emitJobQueued({ jobId: job.id, uuid, jobType: 'sync', deviceName: device.friendlyName || device.outputPath });
    res.json({ success: true, message: 'Sync job queued', jobId: job.id });
  } catch(e) { 
    try{ emitLog({ timestamp: new Date(), message: `Sync failed for device ${uuid}: ${e.message || e}`, level: 'error' }) }catch(err){}
    res.status(400).json({ error: 'Device not found' }); 
  }
}
