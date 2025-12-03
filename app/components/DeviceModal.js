import { useEffect, useState } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, FormControl, FormLabel, Input, Checkbox, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td, Box, Text } from '@chakra-ui/react'

export default function DeviceModal({ isOpen, onClose, onSave, initial }){
  const [device, setDevice] = useState(initial || { friendlyName:'', outputPath:'', uuid:'', sourcePath:'', status:'active', mergerEnabled:false, dryRun:false, deleteAfterMerge:false })
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState([])

  useEffect(()=> setDevice(initial || { friendlyName:'', outputPath:'', uuid:'', sourcePath:'', status:'active', mergerEnabled:false, dryRun:false, deleteAfterMerge:false }), [initial])

  async function scanDevices(){
    setScanning(true)
    try{
      const r = await fetch('/api/scan')
      const json = await r.json()
      setScanned(json || [])
    }catch(e){
      setScanned([])
    }
    setScanning(false)
  }

  function fill(sc){
    setDevice(d=>({...d, uuid: sc.uuid, friendlyName: sc.label || sc.name, outputPath: sc.label || sc.name, sourcePath: device.sourcePath || ''}))
  }

  function _onSave(){ onSave(device) }

  return (
    <Modal isOpen={!!isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg="brand.panel" color="brand.text">
        <ModalHeader><Text as="span"><i className="fa-solid fa-usb"></i> Device</Text></ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Box width="48%">
                <FormControl>
                  <FormLabel>Friendly Name</FormLabel>
                  <Input value={device.friendlyName} onChange={e=>setDevice({...device, friendlyName:e.target.value})} />
                </FormControl>
                <FormControl mt={2}>
                  <FormLabel>Output Path</FormLabel>
                  <Input value={device.outputPath} onChange={e=>setDevice({...device, outputPath:e.target.value})} />
                </FormControl>
                <FormControl mt={2}>
                  <FormLabel>UUID</FormLabel>
                  <Input value={device.uuid} onChange={e=>setDevice({...device, uuid:e.target.value})} />
                </FormControl>
              </Box>

              <Box width="48%">
                <FormControl>
                  <FormLabel>Source Path</FormLabel>
                  <Input value={device.sourcePath} onChange={e=>setDevice({...device, sourcePath:e.target.value})} />
                </FormControl>
                <FormControl mt={3}>
                  <Checkbox isChecked={device.status==='active'} onChange={e=>setDevice({...device, status: e.target.checked ? 'active' : 'paused'})}>Active (uncheck to pause)</Checkbox>
                </FormControl>
                <FormControl mt={2}>
                  <Checkbox isChecked={!!device.mergerEnabled} onChange={e=>setDevice({...device, mergerEnabled:!!e.target.checked})}>Enable Merger</Checkbox>
                </FormControl>
                <FormControl mt={2}>
                  <Checkbox isChecked={!!device.deleteAfterMerge} onChange={e=>setDevice({...device, deleteAfterMerge:!!e.target.checked})} isDisabled={!device.mergerEnabled}>Delete splits after merge</Checkbox>
                </FormControl>
                <FormControl mt={2}>
                  <Checkbox isChecked={!!device.dryRun} onChange={e=>setDevice({...device, dryRun:!!e.target.checked})}>Dry Run (don't delete source)</Checkbox>
                </FormControl>
              </Box>
            </HStack>

            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="600">Detected Devices</Text>
                <Button 
                  size="sm" 
                  onClick={scanDevices} 
                  isLoading={scanning}
                  background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                  color="white"
                  _hover={{ opacity: 0.9 }}
                >
                  Refresh
                </Button>
              </HStack>
              <Box borderRadius="6px" p={2} bg="blackAlpha.300" maxH="36vh" overflowY="auto">
                <Table size="sm">
                  <Thead>
                    <Tr><Th>Name</Th><Th>Type</Th><Th>UUID</Th><Th></Th></Tr>
                  </Thead>
                  <Tbody>
                    {scanned.map(s=> (
                      <Tr key={s.uuid + s.name}>
                        <Td><Box fontWeight="600">{s.label || s.name}</Box><Box fontSize="sm" color="brand.muted">{s.size}</Box></Td>
                        <Td>{s.transport || s.type}</Td>
                        <Td fontFamily="monospace" fontSize="sm">{s.uuid}</Td>
                        <Td isNumeric>
                          <Button 
                            size="sm" 
                            onClick={()=>fill(s)}
                            variant="outline"
                            color="white"
                            borderColor="whiteAlpha.400"
                            bg="whiteAlpha.100"
                            _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.600' }}
                          >
                            Fill
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                    {scanned.length===0 && <Tr><Td colSpan={4} textAlign="center" color="brand.muted">No devices detected</Td></Tr>}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button 
            mr={3} 
            onClick={_onSave}
            background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
            color="white"
            _hover={{ opacity: 0.9 }}
          >
            Save
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClose}
            color="white"
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
