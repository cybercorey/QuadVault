import { useEffect, useState } from 'react'
import { Table, Thead, Tbody, Tr, Th, Td, Button, Badge, HStack, VStack, Text, Select, Box, Progress, IconButton, useToast } from '@chakra-ui/react'
import { FiClock, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import JobModal from './JobModal'
import { getSocket } from '../lib/useSocket'

function TimeCell({ ts }){
  const [text, setText] = useState('')
  useEffect(()=>{
    try { setText(new Date(ts).toLocaleString()) } catch(e){ setText('') }
  }, [ts])
  return <Text fontSize="xs" color="whiteAlpha.800">{text || '-'}</Text>
}

export default function HistoryList(){
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [storage, setStorage] = useState({total:null, avail:null, lastUpdated:null, computing:false})
  const [activeJobs, setActiveJobs] = useState({}) // {jobId: {percent, currentFile, uuid}}
  const toast = useToast()

  useEffect(()=>{ load(page, limit); loadActiveJobs() }, [page, limit])

  async function loadActiveJobs(){
    try{
      const r = await fetch('/api/queue-status')
      const j = await r.json()
      console.log('[HistoryList] loadActiveJobs response:', j)
      if(j && j.activeJobs && Array.isArray(j.activeJobs)){
        const jobs = {}
        j.activeJobs.forEach(job=>{
          if(job.id){
            jobs[job.id] = {
              percent: job.progress || 0,
              currentFile: job.currentFile || 'Processing...',
              uuid: job.data?.uuid || null
            }
          }
        })
        console.log('[HistoryList] Loaded active jobs:', jobs)
        setActiveJobs(jobs)
      }
    }catch(e){ 
      console.error('[HistoryList] loadActiveJobs error:', e)
    }
  }

  // Listen to socket events for real-time updates
  useEffect(()=>{
    const sock = getSocket()
    
    // Define handlers with stable references
    const handleProgress = (data) => {
      // data: {jobId, uuid, percent, currentFile, moved, total, status}
      console.log('[HistoryList] progress event:', data)
      if(!data || !data.jobId) return
      
      setActiveJobs(prev=>{
        const isNew = !prev[data.jobId]
        // If this is a new job, reload history to show it
        if(isNew) {
          console.log('[HistoryList] New job detected, reloading history')
          setTimeout(() => {
            fetch(`/api/history?page=${page}&limit=${limit}`)
              .then(r=>r.json())
              .then(j=>{
                setRows(j.jobs || [])  // Changed from j.rows
                setTotal(j.total || 0)
              })
              .catch(()=>{})
          }, 100)
        }
        return {...prev, [data.jobId]: data}
      })
      
      // Update the row in table with current status
      setRows(r=>r.map(row=>row.id===data.jobId ? {...row, status: data.status || 'Running'} : row))
    }
    
    const handleJobComplete = (data) => {
      // data: {id, status, uuid}
      console.log('[HistoryList] job_complete event:', data)
      if(!data || !data.id) return
      setActiveJobs(prev=>{ const next={...prev}; delete next[data.id]; return next })
      // Reload current page to get updated job details
      console.log('[HistoryList] Job completed, reloading history')
      setTimeout(() => {
        fetch(`/api/history?page=${page}&limit=${limit}`)
          .then(r=>r.json())
          .then(j=>{
            setRows(j.jobs || [])  // Changed from j.rows
            setTotal(j.total || 0)
          })
          .catch(()=>{})
      }, 500)
    }
    
    const handleJobLog = (data) => {
      // future use: could show toast notifications
    }
    
    const handleJobQueued = (data) => {
      // data: {jobId, uuid, jobType, deviceName}
      console.log('[HistoryList] job_queued event:', data)
      if(!data || !data.jobId) return
      
      // Immediately reload history to show the new queued job
      console.log('[HistoryList] New job queued, reloading history')
      setTimeout(() => {
        fetch(`/api/history?page=${page}&limit=${limit}`)
          .then(r=>r.json())
          .then(j=>{
            setRows(j.jobs || [])
            setTotal(j.total || 0)
          })
          .catch(()=>{})
      }, 100)
    }
    
    console.log('[HistoryList] Setting up socket listeners')
    sock.on('progress', handleProgress)
    sock.on('job_complete', handleJobComplete)
    sock.on('job_log', handleJobLog)
    sock.on('job_queued', handleJobQueued)
    
    return ()=>{
      console.log('[HistoryList] Cleaning up socket listeners')
      sock.off('progress', handleProgress)
      sock.off('job_complete', handleJobComplete)
      sock.off('job_log', handleJobLog)
      sock.off('job_queued', handleJobQueued)
    }
  }, [page, limit]) // Re-subscribe when page/limit changes for accurate reloads

  async function load(p=1, l=limit){
    setLoading(true)
    try{
      const r = await fetch(`/api/history?page=${p}&limit=${l}`)
      const j = await r.json()
      setRows(j.jobs || [])  // Changed from j.rows to j.jobs
      setTotal(j.total || 0)
      setPage(j.page || p)
      setLimit(j.limit || l)
    }catch(e){ setRows([]); setTotal(0) }
    setLoading(false)
  }

  async function clearAll(){
    if(!confirm('Are you sure you want to clear all completed and failed jobs?')) return
    try{
      const r = await fetch('/api/history?all=true', { method: 'DELETE' })
      const j = await r.json()
      if(j.success){
        toast({ title: 'Jobs cleared', status: 'success', duration: 2000 })
        load(1, limit)
      }
    }catch(e){
      toast({ title: 'Failed to clear jobs', status: 'error', duration: 3000 })
    }
  }

  async function deleteJob(jobId){
    try{
      const r = await fetch(`/api/history?jobId=${jobId}`, { method: 'DELETE' })
      const j = await r.json()
      if(j.success){
        toast({ title: 'Job deleted', status: 'success', duration: 2000 })
        load(page, limit)
      }
    }catch(e){
      toast({ title: 'Failed to delete job', status: 'error', duration: 3000 })
    }
  }

  async function cancelJob(jobId){
    if(!confirm('Cancel this job? It will be removed from the queue.')) return
    try{
      const r = await fetch('/api/cancel-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      })
      const j = await r.json()
      if(j.success){
        toast({ title: 'Job cancelled', status: 'success', duration: 2000 })
        load(page, limit)
      } else {
        toast({ title: 'Failed to cancel', description: j.error, status: 'error', duration: 3000 })
      }
    }catch(e){
      toast({ title: 'Failed to cancel job', status: 'error', duration: 3000 })
    }
  }

  // Storage updates come via socket listener

  function openJob(job){ setSelected(job); setOpen(true) }
  function formatSize(bytes){ if(!bytes) return '-'; const k=1024; const sizes=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return Math.round(bytes/Math.pow(k,i)*100)/100+' '+sizes[i] }
  function formatDuration(sec){
    if(!sec && sec!==0) return '-'
    const s = Math.round(sec)
    if(s<60) return `${s}s`
    const h = Math.floor(s/3600)
    const m = Math.floor((s%3600)/60)
    const rem = s%60
    if(h>0) return `${h}h ${m}m ${rem}s`
    return `${m}m ${rem}s`
  }

  const totalPages = Math.max(1, Math.ceil((total||0)/limit))
  const pageRange = []
  for(let i=Math.max(1, page-2); i<=Math.min(totalPages, page+2); i++) pageRange.push(i)

  return (
    <Box bg="brand.panel" borderRadius="8px" border="1px solid" borderColor="whiteAlpha.100" p={4}>
      <HStack justify="space-between" mb={4}>
        <HStack spacing={3}>
          <FiClock size={20} />
          <Text fontWeight="600" fontSize="lg">Transfer History</Text>
        </HStack>
        <Button 
          size="sm" 
          leftIcon={<FiTrash2 />} 
          onClick={clearAll}
          colorScheme="red"
          variant="outline"
          isDisabled={total === 0}
        >
          Clear All
        </Button>
      </HStack>

      <Box bg="whiteAlpha.50" borderRadius="6px" border="1px solid" borderColor="whiteAlpha.100" overflow="hidden">
        <Table size="sm" variant="striped" colorScheme="whiteAlpha">
          <Thead>
            <Tr><Th color="whiteAlpha.900">Time</Th><Th color="whiteAlpha.900">Device</Th><Th color="whiteAlpha.900">Type</Th><Th color="whiteAlpha.900">Status</Th><Th color="whiteAlpha.900">Files</Th><Th color="whiteAlpha.900">Size</Th><Th color="whiteAlpha.900">Duration</Th><Th></Th></Tr>
          </Thead>
          <Tbody>
            {rows.map(r=> {
              const jobProg = activeJobs[r.id]
              const isRunning = jobProg || r.status === 'Running'
              // Progress bar appears in Status column for running jobs
              if (jobProg) console.log('[HistoryList] PROGRESS BAR for job', r.id, ':', jobProg.percent, '%', jobProg.currentFile)
              return (
              <Tr key={r.id}>
                <Td color="whiteAlpha.900"><TimeCell ts={r.timestamp} /></Td>
                <Td color="whiteAlpha.900">{r.device_name}</Td>
                <Td>
                  <Badge 
                    background={
                      r.jobType === 'sync' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
                      r.jobType === 'merge' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
                      r.jobType === 'stabilize' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                      'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                    }
                    color="white"
                    px={2}
                    py={1}
                    textTransform="capitalize"
                  >
                    {r.jobType || 'sync'}
                  </Badge>
                </Td>
                <Td>
                  {isRunning ? (
                    <VStack align="start" spacing={1} minW="200px">
                      <Badge 
                        background={r.status === 'Merging' ? 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}
                        color="white"
                        px={2}
                        py={1}
                      >
                        {r.status || 'Running'}
                      </Badge>
                      {jobProg ? (
                        <Box w="full">
                          <Progress 
                            value={jobProg.percent||0} 
                            size="sm" 
                            sx={{
                              '& > div': {
                                background: 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))'
                              }
                            }}
                            hasStripe 
                            isAnimated 
                          />
                          <Text fontSize="2xs" color="whiteAlpha.700" mt={1} noOfLines={1}>{jobProg.percent||0}% — {jobProg.currentFile||'...'}</Text>
                        </Box>
                      ) : (
                        <Text fontSize="2xs" color="whiteAlpha.600">Initializing...</Text>
                      )}
                    </VStack>
                  ) : (
                    <Badge 
                      background={r.status==='Completed'?'linear-gradient(135deg, #10b981 0%, #059669 100%)':r.status==='Merging'?'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))':r.status.includes('Failed')?'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)':r.status==='Nothing to do'?'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)':'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}
                      color="white"
                      px={2}
                      py={1}
                    >
                      {r.status}
                    </Badge>
                  )}
                </Td>
                <Td color="whiteAlpha.900">{r.files_moved}</Td>
                <Td color="whiteAlpha.900">{formatSize(r.total_size)}</Td>
                <Td color="whiteAlpha.900">{formatDuration(r.duration_seconds)}</Td>
                {/* removed duplicate timestamp column */}
                <Td isNumeric>
                  <HStack spacing={1} justify="flex-end">
                    {(r.status === 'Queued' || isRunning) ? (
                      <Button 
                        size="xs" 
                        onClick={()=>cancelJob(r.id)}
                        colorScheme="orange"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    ) : (
                      <>
                        <Button 
                          size="xs" 
                          onClick={()=>openJob(r)} 
                          variant="outline"
                          color="white"
                          borderColor="whiteAlpha.400"
                          bg="whiteAlpha.100"
                          _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.600' }}
                        >
                          Details
                        </Button>
                        <IconButton
                          size="xs"
                          icon={<FiTrash2 />}
                          onClick={()=>deleteJob(r.id)}
                          variant="ghost"
                          color="red.300"
                          aria-label="Delete job"
                          _hover={{ bg: 'red.900', color: 'red.200' }}
                        />
                      </>
                    )}
                  </HStack>
                </Td>
              </Tr>
            )})}
            {rows.length===0 && <Tr><Td colSpan={8} textAlign="center" color="brand.muted" py={6}>No transfer history</Td></Tr>}
          </Tbody>
        </Table>
      </Box>

      <HStack justify="space-between" spacing={2} pt={4}>
        <Select 
          size="sm" 
          width="80px" 
          value={limit} 
          onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value, 10)) }} 
          bg="whiteAlpha.100" 
          borderColor="whiteAlpha.300" 
          color="white"
          _hover={{ bg: 'whiteAlpha.200' }}
          sx={{
            'option': {
              bg: 'gray.800',
              color: 'white'
            }
          }}
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </Select>
        <HStack>
          <Button 
            size="sm" 
            onClick={()=>setPage(p=>Math.max(1,p-1))} 
            isDisabled={page<=1}
            variant="outline"
            color="white"
            borderColor="whiteAlpha.400"
            bg="whiteAlpha.100"
            _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.600' }}
          >
            Prev
          </Button>
          {pageRange.map(n=>(
            <Button 
              size="sm" 
              key={n} 
              background={n===page ? 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))' : undefined}
              bg={n===page ? undefined : 'whiteAlpha.100'}
              variant={n===page ? 'solid' : 'ghost'} 
              onClick={()=>setPage(n)}
              color="white"
              borderColor={n===page ? undefined : 'whiteAlpha.300'}
              _hover={n===page ? { opacity: 0.9 } : { bg: 'whiteAlpha.200' }}
            >
              {n}
            </Button>
          ))}
          <Button 
            size="sm" 
            onClick={()=>setPage(p=>Math.min(totalPages,p+1))} 
            isDisabled={page>=totalPages}
            variant="outline"
            color="white"
            borderColor="whiteAlpha.400"
            bg="whiteAlpha.100"
            _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.600' }}
          >
            Next
          </Button>
        </HStack>
      </HStack>

      <JobModal isOpen={open} onClose={()=>setOpen(false)} job={selected} />
    </Box>
  )
}
