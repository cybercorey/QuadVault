import { useState, useEffect } from 'react';
import { 
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  SimpleGrid, Box, Image, Text, VStack, HStack, Button, Badge, Spinner,
  useToast, Tooltip, Checkbox, useDisclosure, Alert, AlertIcon,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay
} from '@chakra-ui/react';
import { FiRefreshCw, FiZap, FiClock, FiAlertCircle } from 'react-icons/fi';
import { useRef } from 'react';

export default function DeviceHistoryModal({ device, isOpen, onClose }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [deleteSynced, setDeleteSynced] = useState(false);
  const [deleteMerged, setDeleteMerged] = useState(false);
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();
  
  useEffect(() => {
    if (device && isOpen) {
      loadHistory();
      loadCapabilities();
    }
  }, [device, isOpen]);
  
  const loadCapabilities = async () => {
    try {
      const res = await fetch('/api/capabilities');
      const data = await res.json();
      setCapabilities(data);
    } catch (err) {
      console.error('Failed to load capabilities:', err);
      // Default to assuming all features available
      setCapabilities({
        stabilization_enabled: true,
        merge_enabled: true,
        sync_enabled: true
      });
    }
  };
  
  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/device/${device.uuid}/history`);
      const data = await res.json();
      setFolders(data.folders || []);
    } catch (err) {
      toast({
        title: 'Failed to load history',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleMerge = async (folder) => {
    setSelectedFolder(folder);
    setActionType('merge');
    setDeleteSynced(false);
    setDeleteMerged(false);
    onConfirmOpen();
  };
  
  const executeMerge = async () => {
    try {
      const res = await fetch(`/api/merge/${device.uuid}?folder=${selectedFolder.name}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAfter: deleteSynced })
      });
      
      if (!res.ok) throw new Error('Merge request failed');
      
      toast({
        title: 'Merge job queued',
        description: `Processing ${selectedFolder.name}`,
        status: 'success',
        duration: 3000
      });
      
      onConfirmClose();
      // Refresh history to update status
      setTimeout(loadHistory, 1000);
    } catch (err) {
      toast({
        title: 'Merge failed',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    }
  };
  
  const handleStabilize = async (folder) => {
    setSelectedFolder(folder);
    setActionType('stabilize');
    setDeleteSynced(false);
    setDeleteMerged(false);
    onConfirmOpen();
  };
  
  const executeStabilize = async () => {
    try {
      const res = await fetch(`/api/stabilize/${device.uuid}?folder=${selectedFolder.name}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deleteAfterMerge: deleteSynced,
          deleteAfterStabilize: deleteMerged 
        })
      });
      
      if (!res.ok) throw new Error('Stabilize request failed');
      
      toast({
        title: 'Stabilize job queued',
        description: `Processing ${selectedFolder.name}`,
        status: 'success',
        duration: 3000
      });
      
      onConfirmClose();
      // Refresh history to update status
      setTimeout(loadHistory, 1000);
    } catch (err) {
      toast({
        title: 'Stabilize failed',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    }
  };
  
  const formatDate = (folderName) => {
    // Convert 2025-12-03_18-17-37 to "Dec 3, 2025 6:17 PM"
    const parts = folderName.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
    if (!parts) return folderName;
    
    const [, year, month, day, hour, min, sec] = parts;
    const date = new Date(year, month - 1, day, hour, min, sec);
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  
  if (!device) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="brand.panel" maxH="90vh">
        <ModalHeader>
          <HStack>
            <FiClock />
            <Text>{device.friendlyName} - Sync History</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6} overflowY="auto">
          {/* Show warning if stabilization is not available */}
          {capabilities && !capabilities.stabilization_enabled && (
            <Alert status="warning" mb={4} borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={0} flex={1}>
                <Text fontWeight="600" fontSize="sm">
                  Video stabilization unavailable
                </Text>
                <Text fontSize="xs" color="whiteAlpha.700">
                  {capabilities.gpu_support 
                    ? 'GPU detected but not available for processing'
                    : 'This is a CPU-only build - GPU required for stabilization'
                  }
                </Text>
              </VStack>
            </Alert>
          )}
          
          {loading ? (
            <VStack py={8}>
              <Spinner size="xl" color="purple.500" />
              <Text color="whiteAlpha.700">Loading history...</Text>
            </VStack>
          ) : folders.length === 0 ? (
            <VStack py={8}>
              <Text color="whiteAlpha.700">No sync history found</Text>
            </VStack>
          ) : (
            <SimpleGrid columns={[1, 2, 3]} spacing={4}>
              {folders.map((folder) => (
                <Box 
                  key={folder.name}
                  bg="whiteAlpha.100" 
                  p={4} 
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  transition="all 0.2s"
                  _hover={{ 
                    borderColor: 'purple.400',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <VStack align="stretch" spacing={3}>
                    {/* Thumbnail Grid */}
                    {folder.thumbnails.length > 0 ? (
                      <SimpleGrid columns={2} spacing={1}>
                        {folder.thumbnails.slice(0, 4).map((thumb, i) => (
                          <Image 
                            key={i}
                            src={thumb}
                            h="60px"
                            objectFit="cover"
                            borderRadius="md"
                            fallback={<Box h="60px" bg="gray.700" borderRadius="md" />}
                          />
                        ))}
                      </SimpleGrid>
                    ) : (
                      <Box h="120px" bg="gray.700" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                        <Text color="whiteAlpha.500" fontSize="sm">No thumbnails</Text>
                      </Box>
                    )}
                    
                    <VStack align="stretch" spacing={2}>
                      <Tooltip label={folder.name}>
                        <Text fontWeight="600" fontSize="sm" noOfLines={1}>
                          {formatDate(folder.name)}
                        </Text>
                      </Tooltip>
                      
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge colorScheme="blue" fontSize="xs">
                          {folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''}
                        </Badge>
                        <Badge colorScheme="purple" fontSize="xs">
                          {(folder.totalSize / 1024 / 1024 / 1024).toFixed(1)} GB
                        </Badge>
                        {folder.hasMerged && (
                          <Badge colorScheme="green" fontSize="xs">Merged</Badge>
                        )}
                        {folder.hasStabilized && (
                          <Badge colorScheme="orange" fontSize="xs">Stabilized</Badge>
                        )}
                      </HStack>
                      
                      <HStack spacing={2}>
                        <Button 
                          size="xs" 
                          colorScheme="purple" 
                          flex={1}
                          leftIcon={<FiRefreshCw />}
                          onClick={() => handleMerge(folder)}
                          isDisabled={folder.hasMerged}
                        >
                          {folder.hasMerged ? 'Merged' : 'Merge'}
                        </Button>
                        {capabilities?.stabilization_enabled && (
                          <Button 
                            size="xs" 
                            colorScheme="green" 
                            flex={1}
                            leftIcon={<FiZap />}
                            onClick={() => handleStabilize(folder)}
                            isDisabled={!folder.hasMerged || folder.hasStabilized}
                          >
                            {folder.hasStabilized ? 'Stabilized' : 'Stabilize'}
                          </Button>
                        )}
                      </HStack>
                    </VStack>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </ModalBody>
      </ModalContent>
      
      <AlertDialog
        isOpen={isConfirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={onConfirmClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="brand.panel" borderColor="whiteAlpha.200">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {actionType === 'merge' ? 'Merge Videos' : 'Merge & Stabilize Videos'}
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack align="stretch" spacing={3}>
                <Text>
                  {actionType === 'merge' 
                    ? `Merge split video files in ${selectedFolder?.name}?`
                    : `Merge and stabilize video files in ${selectedFolder?.name}?`
                  }
                </Text>
                
                <Checkbox 
                  isChecked={deleteSynced} 
                  onChange={(e) => setDeleteSynced(e.target.checked)}
                  colorScheme="red"
                >
                  <Text fontSize="sm">
                    Delete synced files after merging
                  </Text>
                </Checkbox>
                
                {actionType === 'stabilize' && (
                  <Checkbox 
                    isChecked={deleteMerged} 
                    onChange={(e) => setDeleteMerged(e.target.checked)}
                    colorScheme="red"
                  >
                    <Text fontSize="sm">
                      Delete merged files after stabilizing
                    </Text>
                  </Checkbox>
                )}
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onConfirmClose} variant="ghost">
                Cancel
              </Button>
              <Button 
                colorScheme={actionType === 'merge' ? 'purple' : 'green'} 
                onClick={actionType === 'merge' ? executeMerge : executeStabilize} 
                ml={3}
              >
                {actionType === 'merge' ? 'Merge' : 'Merge & Stabilize'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Modal>
  );
}
