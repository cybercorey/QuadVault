const { getRecentLogs } = require('../../lib/socket')

export default function handler(req, res){
  if(req.method !== 'GET') return res.status(405).end()
  try{
    const logs = getRecentLogs()
    res.json({ logs })
  }catch(e){ res.status(500).json({ error: 'failed' }) }
}
