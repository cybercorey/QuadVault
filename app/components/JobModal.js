import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, VStack, Box, Text, List, ListItem, Divider, HStack, Badge } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export default function JobModal({ isOpen, onClose, job: initialJob }){
  const [job, setJob] = useState(initialJob)
  
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

  return (
    <Modal isOpen={!!isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="brand.panel" color="brand.text" maxH="90vh">
        <ModalHeader>Job #{job.id} — {job.device_name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
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

            <Box>
              <Text fontWeight="600" mb={2}>Copied Files ({files.length})</Text>
              {files.length ? (
                <List spacing={1} style={{maxHeight:'220px', overflow:'auto'}} bg="blackAlpha.300" p={3} borderRadius="6px">
                  {files.map((f,i)=>{
                    const filePath = typeof f === 'string' ? f : (f.path || JSON.stringify(f))
                    const fileSize = typeof f === 'object' && f.size ? ` (${formatSize(f.size)})` : ''
                    const fileDate = typeof f === 'object' && f.date ? new Date(f.date).toLocaleString() : ''
                    return (
                      <ListItem key={i}>
                        <HStack justify="space-between">
                          <Text fontSize="sm" fontFamily="monospace">{filePath}{fileSize}</Text>
                          {fileDate && <Text fontSize="xs" color="whiteAlpha.600">{fileDate}</Text>}
                        </HStack>
                      </ListItem>
                    )
                  })}
                </List>
              ) : <Text color="brand.muted">No files recorded</Text>}
            </Box>

            {(merges.length > 0 || job.merge_json) && (
              <>
                <Divider borderColor="whiteAlpha.200" />
                <Box>
                  <Text fontWeight="600" mb={2}>Merged Videos ({merges.length})</Text>
                  {merges.length === 0 ? (
                    <Text color="brand.muted">No merges were performed (files may have been skipped)</Text>
                  ) : (
                    <VStack align="stretch" spacing={3}>
                      {merges.map((merge, idx) => (
                      <Box key={idx} bg="blackAlpha.300" p={3} borderRadius="6px">
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="600" color="purple.300">Output:</Text>
                          <Text fontFamily="monospace" fontSize="sm">{merge.output}</Text>
                        </HStack>
                        <Box>
                          <Text fontSize="sm" color="whiteAlpha.700" mb={1}>Merged from {merge.inputs?.length || 0} files:</Text>
                          <List spacing={0.5} ml={4}>
                            {(merge.inputs || []).map((input, i) => (
                              <ListItem key={i}>
                                <Text fontSize="xs" fontFamily="monospace" color="whiteAlpha.600">• {input}</Text>
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                        {merge.removed && merge.removed.length > 0 && (
                          <Box mt={2}>
                            <Text fontSize="sm" color="red.300">Removed {merge.removed.length} split file(s) after merge</Text>
                          </Box>
                        )}
                      </Box>
                    ))}
                    </VStack>
                  )}
                </Box>
              </>
            )}

            <Divider borderColor="whiteAlpha.200" />

            <Box>
              <Text fontWeight="600" mb={2}>Logs</Text>
              <Box bg="blackAlpha.400" p={3} borderRadius="6px" fontFamily="monospace" fontSize="sm" style={{maxHeight:'320px', overflow:'auto', whiteSpace:'pre-wrap'}}>
                {logs.length ? logs.map((l,i)=>{
                  const msg = typeof l === 'string' ? l : (l.msg || l.message || JSON.stringify(l))
                  return msg
                }).join('\n') : 'No logs'}
              </Box>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
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
