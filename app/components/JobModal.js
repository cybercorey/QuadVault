import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, VStack, Box, Text, List, ListItem, Divider, HStack, Badge, useToast, Checkbox, Image } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FiFilm, FiVideo } from 'react-icons/fi'

export default function JobModal({ isOpen, onClose, job: initialJob }){
  const [job, setJob] = useState(initialJob)
  const [deleteAfter, setDeleteAfter] = useState(false)
  const [processing, setProcessing] = useState(null) // 'merge' | 'stabilize' | null
  const toast = useToast()
  
  // Fetch latest job data when modal opens
  useEffect(() => {
    if (isOpen && initialJob) {
      fetch(`/api/history?id=${initialJob.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.job) {
            setJob(data.job)
          }
        })
        .catch(() => {})
    } else {
      setJob(initialJob)
    }
  }, [isOpen, initialJob])
  
  if(!job) return null
  const files = (()=>{ try{ return JSON.parse(job.files_json||'[]') }catch(e){ return job.files || [] } })()
  const logs = (()=>{ try{ return JSON.parse(job.logs_json||'[]') }catch(e){ return job.logs || [] } })()
  const merges = (()=>{ try{ return JSON.parse(job.merge_json||'[]') }catch(e){ return [] } })()
  
  function formatSize(bytes){ 
    if(!bytes && bytes!==0) return '-'
    // Convert to number if it's a string
    const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
    if(isNaN(numBytes)) return '-'
    if(numBytes === 0) return '0 B'
    const k=1024; const sizes=['B','KB','MB','GB','TB']
    const i=Math.floor(Math.log(numBytes)/Math.log(k))
    return Math.round(numBytes/Math.pow(k,i)*100)/100+' '+sizes[i]
  }
  
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

  async function triggerMerge() {
    if (!job.data?.targetFolder || !job.uuid) {
      toast({ title: 'Missing job data', description: 'Cannot find sync folder path', status: 'error', duration: 3000 })
      return
    }
    
    setProcessing('merge')
    try {
      const folder = job.data.targetFolder.split('/').pop() // Get folder name from full path
      const res = await fetch(`/api/merge/${job.uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, deleteAfter })
      })
      const data = await res.json()
      
      if (data.success) {
        toast({ 
          title: 'Merge job queued', 
          description: `Job ID: ${data.jobId}`, 
          status: 'success', 
          duration: 5000 
        })
        onClose()
      } else {
        toast({ title: 'Failed to queue merge', description: data.message, status: 'error', duration: 5000 })
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, status: 'error', duration: 5000 })
    } finally {
      setProcessing(null)
    }
  }

  async function triggerStabilize() {
    if (!job.data?.targetFolder || !job.uuid) {
      toast({ title: 'Missing job data', description: 'Cannot find sync folder path', status: 'error', duration: 3000 })
      return
    }
    
    setProcessing('stabilize')
    try {
      const folder = job.data.targetFolder.split('/').pop()
      const res = await fetch(`/api/stabilize/${job.uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, deleteAfter })
      })
      const data = await res.json()
      
      if (data.success) {
        toast({ 
          title: 'Stabilize job queued', 
          description: `Job ID: ${data.jobId}`, 
          status: 'success', 
          duration: 5000 
        })
        onClose()
      } else {
        toast({ title: 'Failed to queue stabilize', description: data.message, status: 'error', duration: 5000 })
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, status: 'error', duration: 5000 })
    } finally {
      setProcessing(null)
    }
  }

  // Check if this is a completed sync job that can trigger merge/stabilize
  const jobType = job.jobType || 'sync'; // Default to sync for old jobs without jobType
  const canTriggerPostProcess = jobType === 'sync' && 
                                 (job.status === 'Completed' || job.status === 'Nothing to do') && 
                                 job.data?.targetFolder
  
  console.log('[JobModal] Debug:', { jobType, status: job.status, hasTargetFolder: !!job.data?.targetFolder, canTriggerPostProcess })

  return (
    <Modal isOpen={!!isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="brand.panel" color="brand.text" maxH="90vh">
        <ModalHeader>Job #{job.id} — {job.device_name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={5}>
            <Box>
              <Text fontWeight="600" mb={2}>Status</Text>
              <HStack spacing={3}>
                <Badge 
                  background={job.status==='Completed'?'linear-gradient(135deg, #10b981 0%, #059669 100%)':job.status==='Merging'?'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))':(job.status||'').includes('Failed')?'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)':'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}
                  color="white"
                  fontSize="md" 
                  px={3} 
                  py={1}
                >
                  {job.status || 'Unknown'}
                </Badge>
                <Text>{job.files_moved || 0} files • {formatSize(job.total_size)} • {formatDuration(job.duration_seconds)}</Text>
              </HStack>
            </Box>

            <Divider borderColor="whiteAlpha.200" />

            {jobType === 'sync' && (
              <Box>
                <Text fontWeight="600" mb={2}>Copied Files ({files.length})</Text>
                {files.length ? (
                  <List spacing={2} style={{maxHeight:'400px', overflow:'auto'}} bg="blackAlpha.300" p={3} borderRadius="6px">
                    {files.map((f,i)=>{
                      const filePath = typeof f === 'string' ? f : (f.path || JSON.stringify(f))
                      const fileSize = typeof f === 'object' && f.size ? ` (${formatSize(f.size)})` : ''
                      const fileDate = typeof f === 'object' && f.date ? new Date(f.date).toLocaleString() : ''
                      const thumbnail = typeof f === 'object' && f.thumbnail ? f.thumbnail : null
                      
                      // Build thumbnail URL
                      const thumbnailUrl = thumbnail && job.data?.targetFolder 
                        ? `/api/thumbnail/${encodeURIComponent(job.data.targetFolder.split('/').slice(-2).join('/'))}/${encodeURIComponent(thumbnail)}`
                        : null
                      
                      return (
                        <ListItem key={i}>
                          <HStack spacing={3} align="start">
                            {thumbnailUrl && (
                              <Image 
                                src={thumbnailUrl} 
                                alt={filePath}
                                boxSize="80px"
                                objectFit="cover"
                                borderRadius="4px"
                                fallback={<Box boxSize="80px" bg="blackAlpha.500" borderRadius="4px" />}
                              />
                            )}
                            <VStack align="start" flex={1} spacing={0}>
                              <Text fontSize="sm" fontFamily="monospace">{filePath}{fileSize}</Text>
                              {fileDate && <Text fontSize="xs" color="whiteAlpha.600">{fileDate}</Text>}
                            </VStack>
                          </HStack>
                        </ListItem>
                      )
                    })}
                  </List>
                ) : <Text color="brand.muted">No files recorded</Text>}
              </Box>
            )}

            {(jobType === 'merge' || jobType === 'stabilize') && (merges.length > 0 || job.merge_json) && (
              <>
                <Divider borderColor="whiteAlpha.200" />
                <Box>
                  <Text fontWeight="600" mb={2}>Merged Videos ({merges.length})</Text>
                  {merges.length === 0 ? (
                    <Text color="brand.muted">No merges were performed (files may have been skipped)</Text>
                  ) : (
                    <VStack align="stretch" spacing={3}>
                      {merges.map((merge, idx) => {
                        // Build thumbnail URL for the output video
                        const outputName = merge.output?.replace('.mp4', '_thumb.jpg');
                        // For merge jobs, thumbnails are in the output subfolder of the target folder
                        // targetFolder might be like: /mnt/network_share/test/2025-12-04_19-38-00
                        // thumbnail path should be: test/2025-12-04_19-38-00/output/filename_thumb.jpg
                        const folderPath = job.data?.targetFolder?.split('/').slice(-2).join('/'); // e.g., "test/2025-12-04_19-38-00"
                        const thumbnailUrl = outputName && folderPath
                          ? `/api/thumbnail/${encodeURIComponent(folderPath)}/output/${encodeURIComponent(outputName)}`
                          : null;
                        
                        return (
                          <Box key={idx} bg="blackAlpha.300" p={3} borderRadius="6px">
                            <HStack align="start" spacing={3} mb={2}>
                              {thumbnailUrl && (
                                <Image 
                                  src={thumbnailUrl} 
                                  alt={merge.output}
                                  boxSize="120px"
                                  objectFit="cover"
                                  borderRadius="6px"
                                  fallback={<Box boxSize="120px" bg="blackAlpha.500" borderRadius="6px" />}
                                />
                              )}
                              <VStack align="start" flex={1} spacing={2}>
                                <Box>
                                  <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Output:</Text>
                                  <Text fontWeight="600" color="purple.300" fontFamily="monospace" fontSize="sm">{merge.output}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Merged from {merge.inputs?.length || 0} files:</Text>
                                  <List spacing={0.5}>
                                    {(merge.inputs || []).slice(0, 3).map((input, i) => (
                                      <ListItem key={i}>
                                        <Text fontSize="xs" fontFamily="monospace" color="whiteAlpha.500">• {input}</Text>
                                      </ListItem>
                                    ))}
                                    {(merge.inputs?.length || 0) > 3 && (
                                      <Text fontSize="xs" color="whiteAlpha.400" ml={2}>
                                        + {merge.inputs.length - 3} more...
                                      </Text>
                                    )}
                                  </List>
                                </Box>
                                {merge.removed && merge.removed.length > 0 && (
                                  <Text fontSize="xs" color="red.300">
                                    🗑 Removed {merge.removed.length} split file(s)
                                  </Text>
                                )}
                              </VStack>
                            </HStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}
                </Box>
              </>
            )}

            {jobType === 'stabilize' && merges.length === 0 && !job.merge_json && (
              <>
                <Divider borderColor="whiteAlpha.200" />
                <Box>
                  <Text fontWeight="600" mb={2}>Stabilized Videos ({files.length})</Text>
                  {files.length > 0 ? (
                    <List spacing={2} style={{maxHeight:'400px', overflow:'auto'}} bg="blackAlpha.300" p={3} borderRadius="6px">
                      {files.map((f,i)=>{
                        const filePath = typeof f === 'string' ? f : (f.path || JSON.stringify(f))
                        const fileSize = typeof f === 'object' && f.size ? ` (${formatSize(f.size)})` : ''
                        const thumbnail = typeof f === 'object' && f.thumbnail ? f.thumbnail : null
                        
                        // Build thumbnail URL for stabilized files in output folder
                        const thumbnailUrl = thumbnail && job.data?.targetFolder 
                          ? `/api/thumbnail/${encodeURIComponent(job.data.targetFolder.split('/').slice(-2).join('/'))}/${encodeURIComponent(thumbnail)}`
                          : null
                        
                        return (
                          <ListItem key={i}>
                            <HStack spacing={3} align="start">
                              {thumbnailUrl && (
                                <Image 
                                  src={thumbnailUrl} 
                                  alt={filePath}
                                  boxSize="80px"
                                  objectFit="cover"
                                  borderRadius="4px"
                                  fallback={<Box boxSize="80px" bg="blackAlpha.500" borderRadius="4px" />}
                                />
                              )}
                              <VStack align="start" flex={1} spacing={0}>
                                <Text fontSize="sm" fontFamily="monospace">{filePath}{fileSize}</Text>
                                <Badge colorScheme="green" fontSize="xs" mt={1}>Stabilized</Badge>
                              </VStack>
                            </HStack>
                          </ListItem>
                        )
                      })}
                    </List>
                  ) : (
                    <Text color="brand.muted">No stabilization details available</Text>
                  )}
                </Box>
              </>
            )}

            <Divider borderColor="whiteAlpha.200" />

            <Box>
              <Text fontWeight="600" mb={2}>Logs</Text>
              <Box 
                bg="blackAlpha.400" 
                p={3} 
                borderRadius="6px" 
                fontFamily="monospace" 
                fontSize="sm" 
                style={{maxHeight:'320px', overflow:'auto', whiteSpace:'pre-wrap'}}
                ref={(el) => {
                  if (el) {
                    el.scrollTop = el.scrollHeight; // Auto-scroll to bottom
                  }
                }}
              >
                {logs.length ? logs.map((l,i)=>{
                  const msg = typeof l === 'string' ? l : (l.msg || l.message || JSON.stringify(l))
                  return msg
                }).join('\n') : 'No logs'}
              </Box>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          {canTriggerPostProcess && (
            <>
              <VStack align="stretch" spacing={3} flex={1} mr={4}>
                <HStack spacing={3}>
                  <Button 
                    leftIcon={<FiFilm />}
                    onClick={triggerMerge}
                    isLoading={processing === 'merge'}
                    colorScheme="blue"
                    variant="outline"
                    size="sm"
                  >
                    Merge Videos
                  </Button>
                  <Button 
                    leftIcon={<FiVideo />}
                    onClick={triggerStabilize}
                    isLoading={processing === 'stabilize'}
                    colorScheme="green"
                    variant="outline"
                    size="sm"
                  >
                    Stabilize Videos
                  </Button>
                </HStack>
                <Checkbox 
                  isChecked={deleteAfter} 
                  onChange={(e) => setDeleteAfter(e.target.checked)}
                  size="sm"
                  colorScheme="purple"
                >
                  Delete source files after processing
                </Checkbox>
              </VStack>
            </>
          )}
          <Button 
            onClick={onClose}
            background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
            color="white"
            _hover={{ opacity: 0.9 }}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
