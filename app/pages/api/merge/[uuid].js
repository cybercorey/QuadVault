const fs = require('fs-extra');
const path = require('path');
const { emitLog, emitJobQueued } = require('../../../lib/socket')
const usbQueue = require('../../../lib/bullQueue');

const CONFIG_FILE = '/app/config.json';
const DEST_ROOT = process.env.DEST_ROOT || '/mnt/network_share';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  
  const { uuid, folder } = req.query;
  
  try {
    // Get device config from JSON file
    const configData = await fs.readJson(CONFIG_FILE);
    const device = configData.devices.find(d => d.uuid === uuid);
    
    if (!device) {
      return res.status(404).json({error: 'Unknown Device'});
    }
    
    // Verify folder exists
    const targetFolder = folder || req.body?.folder;
    if (!targetFolder) {
      return res.status(400).json({error: 'Folder path required'});
    }
    
    const fullPath = path.join(DEST_ROOT, device.outputPath, targetFolder);
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({error: 'Folder not found'});
    }
    
    // Get deleteAfter option from request body
    const deleteAfter = req.body?.deleteAfter || false;
    
    // Create modified config with deleteAfter setting
    const jobConfig = {
      ...device,
      deleteAfterMerge: deleteAfter,
      delete_after_merge: deleteAfter
    };
    
    // Queue merge job
    const job = await usbQueue.add('merge-videos', {
      uuid,
      config: jobConfig,
      targetFolder: fullPath,
      jobType: 'merge'
    }, {
      jobId: `merge-${uuid}-${Date.now()}`,
      priority: 2
    });
    
    emitLog({ timestamp: new Date(), msg: `Merge job queued for ${device.friendlyName || device.outputPath} (Job ID: ${job.id})`, type: 'info' });
    emitJobQueued({ jobId: job.id, uuid, jobType: 'merge', deviceName: device.friendlyName || device.outputPath });
    res.json({ success: true, message: 'Merge job queued', jobId: job.id });
  } catch(e) { 
    emitLog({ timestamp: new Date(), message: `Merge job failed: ${e.message || e}`, level: 'error' });
    res.status(500).json({ error: e.message || 'Failed to queue merge job' }); 
  }
}
