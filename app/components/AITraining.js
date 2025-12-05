import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardHeader,
  CardBody,
  Progress,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Textarea,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  useToast,
  Divider,
  List,
  ListItem,
  ListIcon,
  Spinner,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, TimeIcon, StarIcon } from '@chakra-ui/icons';
import LabelManager from './LabelManager';

export default function AITraining() {
  const toast = useToast();
  const [labelsPath, setLabelsPath] = useState('/media/labels.json');
  const [libraryPath, setLibraryPath] = useState('/media');
  const [datasetStatus, setDatasetStatus] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Poll for status updates
  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/ai-training-status');
      if (res.ok) {
        const data = await res.json();
        setDatasetStatus(data.dataset);
        setTrainingStatus(data.training);
        setBatchStatus(data.batch);
      }
    } catch (err) {
      console.error('Failed to fetch AI training status:', err);
    }
  };

  const prepareDataset = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-prepare-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelsPath })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Dataset Preparation Started',
          description: `Processing ${data.total} videos...`,
          status: 'success',
          duration: 5000,
        });
        fetchStatuses();
      } else {
        throw new Error(data.error || 'Failed to prepare dataset');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const startTraining = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-start-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          datasetPath: '/tmp/training/dataset.json',
          epochs: 50,
          batchSize: 32
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Training Started',
          description: 'Model training is running in the background',
          status: 'success',
          duration: 5000,
        });
        fetchStatuses();
      } else {
        throw new Error(data.error || 'Failed to start training');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const startBatchClassify = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-batch-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          libraryPath,
          modelPath: '/tmp/training/model.pth'
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Batch Classification Started',
          description: `Scanning ${libraryPath}...`,
          status: 'success',
          duration: 5000,
        });
        fetchStatuses();
      } else {
        throw new Error(data.error || 'Failed to start batch classification');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const stopProcess = async (processType) => {
    try {
      const res = await fetch('/api/ai-stop-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processType })
      });
      
      if (res.ok) {
        toast({
          title: 'Process Stopped',
          status: 'info',
          duration: 3000,
        });
        fetchStatuses();
      }
    } catch (err) {
      toast({
        title: 'Error stopping process',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Box p={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>AI Auto-Highlight Training</Heading>
          <Text color="gray.400">
            Train custom models on your drone footage or use CLIP for instant highlights
          </Text>
        </Box>

        <Tabs variant="soft-rounded" colorScheme="purple">
          <TabList>
            <Tab>0. Label Videos</Tab>
            <Tab>1. Prepare Dataset</Tab>
            <Tab>2. Train Model</Tab>
            <Tab>3. Batch Classify</Tab>
            <Tab>Results</Tab>
          </TabList>

          <TabPanels>
            {/* Tab 0: Label Manager */}
            <TabPanel>
              <LabelManager onLabelsReady={(path) => setLabelsPath(path)} />
            </TabPanel>

            {/* Tab 1: Dataset Preparation */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Alert status="info" variant="left-accent">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Step 1: Prepare Training Dataset</AlertTitle>
                    <AlertDescription>
                      Create labels.json in your Samba mount with highlight and normal clips, 
                      then extract frames for training.
                    </AlertDescription>
                  </Box>
                </Alert>

                <Card bg="whiteAlpha.50">
                  <CardHeader>
                    <Heading size="md">Labels File Format</Heading>
                  </CardHeader>
                  <CardBody>
                    <Code display="block" whiteSpace="pre" p={4} borderRadius="md">
{`{
  "highlights": [
    "/media/2024/epic_sunset.mp4",
    "/media/2024/proximity_flight.mp4"
  ],
  "normal": [
    "/media/2024/boring_takeoff.mp4",
    "/media/2024/battery_test.mp4"
  ]
}`}
                    </Code>
                    <Text mt={3} fontSize="sm" color="gray.400">
                      Save this as <Code>/media/labels.json</Code> in your Samba mount
                    </Text>
                  </CardBody>
                </Card>

                <FormControl>
                  <FormLabel>Labels File Path</FormLabel>
                  <Input
                    value={labelsPath}
                    onChange={(e) => setLabelsPath(e.target.value)}
                    placeholder="/media/labels.json"
                  />
                  <FormHelperText>
                    Path to your labels.json file in the Samba mount
                  </FormHelperText>
                </FormControl>

                {datasetStatus && (
                  <Card bg="whiteAlpha.50">
                    <CardBody>
                      <SimpleGrid columns={3} spacing={4}>
                        <Stat>
                          <StatLabel>Status</StatLabel>
                          <StatNumber>
                            <Badge colorScheme={
                              datasetStatus.status === 'complete' ? 'green' :
                              datasetStatus.status === 'running' ? 'blue' : 'gray'
                            }>
                              {datasetStatus.status || 'Not Started'}
                            </Badge>
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Total Frames</StatLabel>
                          <StatNumber>{datasetStatus.totalFrames || 0}</StatNumber>
                          <StatHelpText>
                            Highlights: {datasetStatus.highlightFrames || 0} | 
                            Normal: {datasetStatus.normalFrames || 0}
                          </StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Progress</StatLabel>
                          <StatNumber>{datasetStatus.progress || 0}%</StatNumber>
                        </Stat>
                      </SimpleGrid>
                      {datasetStatus.status === 'running' && (
                        <Box mt={4}>
                          <Progress value={datasetStatus.progress} colorScheme="purple" />
                          <Text mt={2} fontSize="sm" color="gray.400">
                            {datasetStatus.message}
                          </Text>
                        </Box>
                      )}
                    </CardBody>
                  </Card>
                )}

                <HStack>
                  <Button
                    colorScheme="purple"
                    onClick={prepareDataset}
                    isLoading={loading}
                    isDisabled={datasetStatus?.status === 'running'}
                  >
                    Start Dataset Preparation
                  </Button>
                  {datasetStatus?.status === 'running' && (
                    <Button
                      variant="outline"
                      onClick={() => stopProcess('dataset')}
                    >
                      Stop
                    </Button>
                  )}
                </HStack>

                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Extracts 1 frame per second from each video
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Organizes into highlight/normal folders
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Creates dataset.json for training
                  </ListItem>
                </List>
              </VStack>
            </TabPanel>

            {/* Tab 2: Model Training */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Alert status="warning" variant="left-accent">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Step 2: Train Custom Model</AlertTitle>
                    <AlertDescription>
                      Requires GPU for fast training. CPU training will be very slow.
                      Check worker logs for progress.
                    </AlertDescription>
                  </Box>
                </Alert>

                {trainingStatus && (
                  <Card bg="whiteAlpha.50">
                    <CardBody>
                      <SimpleGrid columns={2} spacing={4}>
                        <Stat>
                          <StatLabel>Training Status</StatLabel>
                          <StatNumber>
                            <Badge colorScheme={
                              trainingStatus.status === 'complete' ? 'green' :
                              trainingStatus.status === 'running' ? 'blue' : 'gray'
                            }>
                              {trainingStatus.status || 'Not Started'}
                            </Badge>
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Current Epoch</StatLabel>
                          <StatNumber>
                            {trainingStatus.currentEpoch || 0} / {trainingStatus.totalEpochs || 50}
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Train Accuracy</StatLabel>
                          <StatNumber>{trainingStatus.trainAcc?.toFixed(2) || 0}%</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Val Accuracy</StatLabel>
                          <StatNumber>{trainingStatus.valAcc?.toFixed(2) || 0}%</StatNumber>
                          <StatHelpText>
                            Best: {trainingStatus.bestValAcc?.toFixed(2) || 0}%
                          </StatHelpText>
                        </Stat>
                      </SimpleGrid>
                      {trainingStatus.status === 'running' && (
                        <Box mt={4}>
                          <Progress 
                            value={(trainingStatus.currentEpoch / trainingStatus.totalEpochs) * 100} 
                            colorScheme="purple" 
                          />
                          <Text mt={2} fontSize="sm" color="gray.400">
                            Epoch {trainingStatus.currentEpoch} - Loss: {trainingStatus.loss?.toFixed(4)}
                          </Text>
                        </Box>
                      )}
                      {trainingStatus.status === 'complete' && (
                        <Alert status="success" mt={4}>
                          <AlertIcon />
                          Model saved to: {trainingStatus.modelPath}
                        </Alert>
                      )}
                    </CardBody>
                  </Card>
                )}

                <Card bg="whiteAlpha.50">
                  <CardBody>
                    <Heading size="sm" mb={3}>Training Requirements</Heading>
                    <List spacing={2}>
                      <ListItem>
                        <ListIcon as={datasetStatus?.status === 'complete' ? CheckCircleIcon : TimeIcon} 
                          color={datasetStatus?.status === 'complete' ? 'green.500' : 'yellow.500'} />
                        Dataset prepared ({datasetStatus?.totalFrames || 0} frames)
                      </ListItem>
                      <ListItem>
                        <ListIcon as={WarningIcon} color="yellow.500" />
                        NVIDIA GPU recommended (RTX 3060+)
                      </ListItem>
                      <ListItem>
                        <ListIcon as={TimeIcon} color="blue.500" />
                        Training time: 1-3 hours on GPU
                      </ListItem>
                    </List>
                  </CardBody>
                </Card>

                <HStack>
                  <Button
                    colorScheme="purple"
                    onClick={startTraining}
                    isLoading={loading}
                    isDisabled={
                      datasetStatus?.status !== 'complete' || 
                      trainingStatus?.status === 'running'
                    }
                  >
                    Start Training
                  </Button>
                  {trainingStatus?.status === 'running' && (
                    <Button
                      variant="outline"
                      onClick={() => stopProcess('training')}
                    >
                      Stop Training
                    </Button>
                  )}
                </HStack>

                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Monitor Progress</AlertTitle>
                    <AlertDescription>
                      <Code>docker logs quadvault-worker-dev --tail 50 -f</Code>
                    </AlertDescription>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>

            {/* Tab 3: Batch Classification */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Alert status="info" variant="left-accent">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Step 3: Batch Classify Your 9TB Library</AlertTitle>
                    <AlertDescription>
                      Apply trained model to all videos in your library. This runs overnight.
                    </AlertDescription>
                  </Box>
                </Alert>

                <FormControl>
                  <FormLabel>Library Path</FormLabel>
                  <Input
                    value={libraryPath}
                    onChange={(e) => setLibraryPath(e.target.value)}
                    placeholder="/media"
                  />
                  <FormHelperText>
                    Root path of your drone footage library (Samba mount)
                  </FormHelperText>
                </FormControl>

                {batchStatus && (
                  <Card bg="whiteAlpha.50">
                    <CardBody>
                      <SimpleGrid columns={3} spacing={4}>
                        <Stat>
                          <StatLabel>Status</StatLabel>
                          <StatNumber>
                            <Badge colorScheme={
                              batchStatus.status === 'complete' ? 'green' :
                              batchStatus.status === 'running' ? 'blue' : 'gray'
                            }>
                              {batchStatus.status || 'Not Started'}
                            </Badge>
                          </StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Videos Processed</StatLabel>
                          <StatNumber>
                            {batchStatus.processed || 0} / {batchStatus.total || 0}
                          </StatNumber>
                          <StatHelpText>
                            {batchStatus.speed ? `${batchStatus.speed.toFixed(1)} videos/sec` : ''}
                          </StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Highlights Found</StatLabel>
                          <StatNumber>{batchStatus.highlightsFound || 0}</StatNumber>
                          <StatHelpText>
                            Score threshold: {batchStatus.threshold || 0.7}
                          </StatHelpText>
                        </Stat>
                      </SimpleGrid>
                      {batchStatus.status === 'running' && (
                        <Box mt={4}>
                          <Progress 
                            value={(batchStatus.processed / batchStatus.total) * 100} 
                            colorScheme="purple" 
                          />
                          <Text mt={2} fontSize="sm" color="gray.400">
                            Estimated time remaining: {batchStatus.eta || 'Calculating...'}
                          </Text>
                        </Box>
                      )}
                      {batchStatus.status === 'complete' && (
                        <Alert status="success" mt={4}>
                          <AlertIcon />
                          <Box>
                            <AlertTitle>Batch Classification Complete!</AlertTitle>
                            <AlertDescription>
                              Found {batchStatus.highlightsFound} highlights.
                              Results saved to: {batchStatus.outputPath}
                            </AlertDescription>
                          </Box>
                        </Alert>
                      )}
                    </CardBody>
                  </Card>
                )}

                <Card bg="whiteAlpha.50">
                  <CardBody>
                    <Heading size="sm" mb={3}>Performance Estimates</Heading>
                    <List spacing={2}>
                      <ListItem>
                        <ListIcon as={StarIcon} color="purple.500" />
                        RTX 4090: 6-8 hours for 18,000 videos
                      </ListItem>
                      <ListItem>
                        <ListIcon as={StarIcon} color="purple.500" />
                        RTX 3070: 12-18 hours for 18,000 videos
                      </ListItem>
                      <ListItem>
                        <ListIcon as={StarIcon} color="purple.500" />
                        RTX 3060: 18-24 hours for 18,000 videos
                      </ListItem>
                    </List>
                  </CardBody>
                </Card>

                <HStack>
                  <Button
                    colorScheme="purple"
                    onClick={startBatchClassify}
                    isLoading={loading}
                    isDisabled={
                      trainingStatus?.status !== 'complete' || 
                      batchStatus?.status === 'running'
                    }
                  >
                    Start Batch Classification
                  </Button>
                  {batchStatus?.status === 'running' && (
                    <Button
                      variant="outline"
                      onClick={() => stopProcess('batch')}
                    >
                      Stop
                    </Button>
                  )}
                </HStack>

                <Alert status="warning">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Long Running Process</AlertTitle>
                    <AlertDescription>
                      This process runs in the background and may take 12-24 hours.
                      You can close the browser - check back later for results.
                    </AlertDescription>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>

            {/* Tab 4: Results */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Heading size="md">Training Results & Highlights</Heading>

                {batchStatus?.status === 'complete' && batchStatus.highlights && (
                  <Card bg="whiteAlpha.50">
                    <CardHeader>
                      <Heading size="sm">Top Highlights ({batchStatus.highlights.length})</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                        {batchStatus.highlights.slice(0, 50).map((highlight, idx) => (
                          <HStack key={idx} justify="space-between" p={2} bg="whiteAlpha.50" borderRadius="md">
                            <Text fontSize="sm" noOfLines={1} flex={1}>
                              {highlight.path.split('/').pop()}
                            </Text>
                            <Badge colorScheme="purple">
                              {(highlight.score * 100).toFixed(1)}%
                            </Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {trainingStatus?.status === 'complete' && (
                  <SimpleGrid columns={2} spacing={4}>
                    <Card bg="whiteAlpha.50">
                      <CardBody>
                        <Stat>
                          <StatLabel>Model Accuracy</StatLabel>
                          <StatNumber>{trainingStatus.bestValAcc?.toFixed(2)}%</StatNumber>
                          <StatHelpText>Best validation accuracy achieved</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card bg="whiteAlpha.50">
                      <CardBody>
                        <Stat>
                          <StatLabel>Training Epochs</StatLabel>
                          <StatNumber>{trainingStatus.totalEpochs}</StatNumber>
                          <StatHelpText>Completed successfully</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                )}

                {(!batchStatus || batchStatus.status !== 'complete') && (
                  <Alert status="info">
                    <AlertIcon />
                    Results will appear here after batch classification completes
                  </Alert>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
}
