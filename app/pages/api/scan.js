import { exec } from 'child_process';

export default function handler(req, res){
  exec('lsblk -J -o NAME,UUID,LABEL,SIZE,FSTYPE,TRAN', (e, stdout) => {
    if(e) return res.status(500).json({error: "Scan failed"});
    try {
      const raw = JSON.parse(stdout);
      const flat = [];
      const trav = (nodes) => {
        for(const n of nodes){
          if(n.uuid || n.tran==='usb') flat.push({name:n.name, uuid:n.uuid||'NO_UUID', label:n.label, size:n.size, type:n.fstype, transport:n.tran});
          if(n.children) trav(n.children);
        }
      };
      trav(raw.blockdevices || []);
      res.json(flat);
    } catch(err) { res.status(500).json({ error: 'Failed to parse lsblk' }); }
  });
}
