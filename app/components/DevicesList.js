import { useEffect, useState } from 'react'
import { Button, Badge, HStack, VStack, Text, Box, IconButton, Spinner } from '@chakra-ui/react'
import { FiPlay, FiPause, FiEdit2, FiTrash2, FiPlus, FiHardDrive } from 'react-icons/fi'
import DeviceModal from './DeviceModal'
import useSocket, { getSocket } from '../lib/useSocket'

export default function DevicesList(){
  const [devices, setDevices] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [storageChildren, setStorageChildren] = useState([])
  const [storageTotal, setStorageTotal] = useState(null)
  const [storageLoading, setStorageLoading] = useState(false)
  const [activeJobs, setActiveJobs] = useState({}) // {uuid: {jobId, percent, currentFile}}

  useEffect(()=>{
    fetch('/api/config').then(r=>r.json()).then(json=>{
      setDevices((json && json.allowed) || [])
    }).catch(()=>setDevices([]))
  }, [refreshKey])

  useEffect(()=>{
    setStorageLoading(true)
    fetch('/api/storage').then(r=>r.json()).then(j=>{
      setStorageChildren(j.children || [])
      setStorageTotal(j.total || null)
    }).catch(()=>setStorageChildren([])).finally(()=>setStorageLoading(false))
  }, [refreshKey])

  // update storage children and total when server emits storage updates
  useSocket('storage', (payload)=>{
    if(!payload) return
    setStorageChildren(payload.children || [])
    setStorageTotal(payload.total || null)
    // Only set loading if computing is true, always clear when false or undefined
    setStorageLoading(!!payload.computing)
  })

  // Track active jobs by UUID
  useEffect(()=>{
    const sock = getSocket()
    function handleProgress(data){
      // data: {jobId, uuid, percent, currentFile, moved, total}
      if(!data || !data.uuid) return
      setActiveJobs(prev=>({...prev, [data.uuid]: {jobId:data.jobId, percent:data.percent, currentFile:data.currentFile}}))
    }
    function handleJobComplete(data){
      // data: {id, status}
      if(!data || !data.id) return
      // Remove job by matching jobId
      setActiveJobs(prev=>{
        const next={...prev}
        for(const uuid in next){
          if(next[uuid].jobId === data.id) delete next[uuid]
        }
        return next
      })
    }
    sock.on('progress', handleProgress)
    sock.on('job_complete', handleJobComplete)
    return ()=>{
      sock.off('progress', handleProgress)
      sock.off('job_complete', handleJobComplete)
    }
  }, [])

  function openAdd(){ setEditing({ friendlyName: '', outputPath: '', uuid: '', sourcePath:'', status:'active', mergerEnabled:false, dryRun:false }); setModalOpen(true) }
  function openEdit(d){ setEditing(d); setModalOpen(true) }

  async function onSave(device){
    const copy = devices.slice()
    if(device.uuid && copy.findIndex(d=>d.uuid===device.uuid)>=0){
      const i = copy.findIndex(d=>d.uuid===device.uuid)
      copy[i] = device
    } else {
      copy.push(device)
    }
    try{
      const r = await fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({allowed: copy}) })
      const json = await r.json()
      if(json && json.success){ setDevices(copy); setModalOpen(false) }
    }catch(e){ console.error(e) }
  }

  async function togglePause(dev){
    const copy = devices.slice()
    const i = copy.findIndex(d=>d.uuid===dev.uuid)
    if(i>=0){
      copy[i] = {...copy[i], status: copy[i].status==='active' ? 'paused' : 'active'}
      try{
        const r = await fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({allowed: copy}) })
        const json = await r.json()
        if(json && json.success){ setDevices(copy) }
      }catch(e){ console.error(e) }
    }
  }

  async function syncNow(dev){
    try{
      const r = await fetch(`/api/sync/${dev.uuid}`, { method: 'POST' })
      const j = await r.json().catch(()=>null)
      if(!r.ok || (j && j.error)){
        const message = j && j.error ? `Sync failed for device ${dev.uuid}: ${j.error}` : `Sync failed for device ${dev.uuid}`
        console.error(message)
      }
    }catch(e){
      console.error(`Sync error for device ${dev.uuid}:`, e)
    }
  }

  async function removeDevice(uuid){
    const copy = devices.filter(d=>d.uuid!==uuid)
    try{ const r = await fetch('/api/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({allowed: copy}) }); const json = await r.json(); if(json && json.success){ setRefreshKey(k=>k+1) } }catch(e){ console.error(e) }
  }

  return (
    <Box bg="brand.panel" borderRadius="8px" border="1px solid" borderColor="whiteAlpha.100" p={4}>
      <HStack justify="space-between" mb={4}>
        <HStack>
          <Box as={FiHardDrive} mr={2} />
          <Text fontWeight="600" fontSize="lg">Devices</Text>
        </HStack>
        <Button 
          size="sm" 
          leftIcon={<FiPlus />} 
          onClick={openAdd}
          background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
          color="white"
          _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }}
        >
          Add Device
        </Button>
      </HStack>

      <VStack align="stretch" spacing={2}>
        {devices.map(dev => {
          const isRunning = !!activeJobs[dev.uuid]
          return (
          <Box key={dev.uuid || dev.outputPath} bg="whiteAlpha.50" p={3} borderRadius="6px" border="1px solid" borderColor="whiteAlpha.100">
            <HStack justify="space-between" mb={2}>
              <HStack spacing={3}>
                <IconButton 
                  size="sm" 
                  icon={dev.status==='active' ? <FiPause /> : <FiPlay />} 
                  onClick={()=>togglePause(dev)} 
                  variant="outline" 
                  aria-label="Toggle pause" 
                  color="white"
                  borderColor="whiteAlpha.400"
                  bg="whiteAlpha.100"
                  _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.600' }}
                />
                <Box>
                  <HStack spacing={2}>
                    <Text fontWeight="600">{dev.friendlyName || dev.outputPath || 'Unnamed'}</Text>
                    {isRunning && <Badge background="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" color="white" px={2} py={1}>Syncing</Badge>}
                    {!isRunning && <Badge background={dev.status==='active' ? 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'} color="white" px={2} py={1}>{dev.status==='active' ? 'Active' : 'Paused'}</Badge>}
                    {(dev.mergerEnabled || dev.merger_enabled) && <Badge background="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" color="white" px={2} py={1}>Merger</Badge>}
                    {(dev.dryRun || dev.dry_run) && <Badge background="linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" color="white" px={2} py={1}>Dry</Badge>}
                  </HStack>
                  <Text fontSize="xs" color="whiteAlpha.700">Output: <Text as="span" color="purple.300">/{dev.outputPath}</Text> • Src: <Text as="span" color="purple.300">{dev.sourcePath || '-'}</Text></Text>
                </Box>
              </HStack>
              <HStack>
                {!isRunning && <Button 
                  size="sm" 
                  leftIcon={<FiPlay />} 
                  onClick={()=>syncNow(dev)} 
                  isDisabled={dev.status!=='active'}
                  background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                  color="white"
                  _hover={{ opacity: 0.9 }}
                  _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
                >
                  Sync
                </Button>}
                {isRunning && <Spinner size="sm" />}
                <IconButton 
                  size="sm" 
                  icon={<FiEdit2 />} 
                  onClick={()=>openEdit(dev)} 
                  variant="ghost" 
                  aria-label="Edit" 
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  isDisabled={isRunning}
                />
                <IconButton 
                  size="sm" 
                  icon={<FiTrash2 />} 
                  onClick={()=>removeDevice(dev.uuid)} 
                  variant="ghost" 
                  aria-label="Delete"
                  color="red.300"
                  _hover={{ bg: 'red.900', color: 'red.200' }}
                />
              </HStack>
            </HStack>
            <VStack align="start" spacing={1} mt={1}>
              <HStack justify="space-between" w="100%">
                <Text fontSize="xs" color="brand.muted" fontFamily="monospace">UUID: {dev.uuid}</Text>
                {storageLoading && <HStack><Spinner size="xs" /><Text fontSize="xs" color="brand.muted">Loading storage...</Text></HStack>}
                {!storageLoading && (()=>{
                  const normalize = s => (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'')
                  // include uuid and fallback name candidates (friendlyName, outputPath, basename(outputPath))
                  const nameCandidates = [dev.uuid, dev.friendlyName, dev.outputPath, (dev.outputPath||'').split('/').pop()].filter(Boolean).map(normalize)
                  // flexible match: exact normalized match OR candidate contains child name OR child name contains candidate
                  const match = storageChildren.find(c=>{
                    if(!c || !c.name) return false
                    const cn = normalize(c.name)
                    if(nameCandidates.includes(cn)) return true
                    if(nameCandidates.some(n => n && cn.includes(n))) return true
                    if(nameCandidates.some(n => n && n.includes(cn))) return true
                    return false
                  })
                  if(match){
                    const formatSize = (bytes)=>{
                      if(!bytes && bytes!==0) return '-'; const k=1024; const sizes=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return Math.round(bytes/Math.pow(k,i)*100)/100+' '+sizes[i]
                    }
                    const percent = (match.used != null && storageTotal) ? Math.round((match.used / storageTotal) * 100) : null
                    return <Text fontSize="xs" color="whiteAlpha.800">Used: {formatSize(match.used)}{percent != null ? ` (${percent}%)` : ''}</Text>
                  }
                  return <Text fontSize="xs" color="whiteAlpha.600">Used: N/A</Text>
                })()}
              </HStack>
            </VStack>
          </Box>
        )})}
        {devices.length===0 && <Box textAlign="center" color="brand.muted" py={6}>No devices configured. Click Add Device to create one.</Box>}
      </VStack>

      <DeviceModal isOpen={modalOpen} initial={editing} onClose={()=>setModalOpen(false)} onSave={onSave} />
    </Box>
  )
}
