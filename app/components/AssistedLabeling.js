import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Badge,
  useToast,
  Alert,
  AlertIcon,
  Progress,
  Spinner,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  AspectRatio,
  Kbd,
} from '@chakra-ui/react';
import { StarIcon, CloseIcon, ArrowForwardIcon, CheckIcon } from '@chakra-ui/icons';

export default function AssistedLabeling({ onComplete }) {
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [labeled, setLabeled] = useState({ highlights: [], normal: [] });
  const [saving, setSaving] = useState(false);

  const currentVideo = videos[currentIndex];
  const progress = videos.length > 0 ? ((currentIndex / videos.length) * 100) : 0;
  const remaining = videos.length - currentIndex;

  // Scan library for videos
  const scanLibrary = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan-videos?path=/media&limit=100');
      const data = await res.json();
      
      if (data.videos && data.videos.length > 0) {
        setVideos(data.videos);
        toast({
          title: 'Videos Found!',
          description: `Found ${data.videos.length} videos to label`,
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'No Videos Found',
          description: 'Make sure your footage is in /media',
          status: 'warning',
          duration: 5000,
        });
      }
    } catch (err) {
      toast({
        title: 'Scan Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setScanning(false);
    }
  };

  // Label as highlight
  const labelHighlight = () => {
    if (currentVideo) {
      setLabeled(prev => ({
        ...prev,
        highlights: [...prev.highlights, currentVideo.path]
      }));
      nextVideo();
    }
  };

  // Label as normal/skip
  const labelNormal = () => {
    if (currentVideo) {
      setLabeled(prev => ({
        ...prev,
        normal: [...prev.normal, currentVideo.path]
      }));
      nextVideo();
    }
  };

  // Skip without labeling
  const skip = () => {
    nextVideo();
  };

  // Go to next video
  const nextVideo = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Done!
      finishLabeling();
    }
  };

  // Finish and save
  const finishLabeling = async () => {
    if (labeled.highlights.length === 0 && labeled.normal.length === 0) {
      toast({
        title: 'No Labels',
        description: 'Label at least a few videos first',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/ai-save-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: '/media/labels.json',
          labels: labeled
        })
      });

      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'Labels Saved!',
          description: `${labeled.highlights.length} highlights, ${labeled.normal.length} normal`,
          status: 'success',
          duration: 5000,
        });
        if (onComplete) {
          onComplete('/media/labels.json');
        }
      }
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!currentVideo) return;
      
      if (e.key === 'h' || e.key === 'H') {
        labelHighlight();
      } else if (e.key === 'n' || e.key === 'N' || e.key === ' ') {
        labelNormal();
      } else if (e.key === 's' || e.key === 'S') {
        skip();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [currentVideo, currentIndex]);

  if (videos.length === 0) {
    return (
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="md" mb={2}>Assisted Labeling</Heading>
          <Text color="whiteAlpha.700">
            Review videos one-by-one and quickly label them
          </Text>
        </Box>

        <Alert status="info" bg="blue.900" borderColor="blue.600" borderWidth="1px">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">How it works:</Text>
            <Text fontSize="sm" mt={2}>
              1. Scan your video library<br/>
              2. Watch each video thumbnail<br/>
              3. Press <Kbd>H</Kbd> for Highlight or <Kbd>N</Kbd> for Normal<br/>
              4. Save when done
            </Text>
          </Box>
        </Alert>

        <Button
          size="lg"
          colorScheme="purple"
          onClick={scanLibrary}
          isLoading={scanning}
          loadingText="Scanning..."
        >
          Start Scanning Videos
        </Button>

        <SimpleGrid columns={3} spacing={4}>
          <Card bg="whiteAlpha.100">
            <CardBody>
              <Stat>
                <StatLabel color="whiteAlpha.700">Highlights</StatLabel>
                <StatNumber color="green.300">{labeled.highlights.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card bg="whiteAlpha.100">
            <CardBody>
              <Stat>
                <StatLabel color="whiteAlpha.700">Normal</StatLabel>
                <StatNumber color="gray.300">{labeled.normal.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card bg="whiteAlpha.100">
            <CardBody>
              <Stat>
                <StatLabel color="whiteAlpha.700">Total</StatLabel>
                <StatNumber color="purple.300">
                  {labeled.highlights.length + labeled.normal.length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Progress Header */}
      <Box>
        <HStack justify="space-between" mb={2}>
          <Heading size="md">Labeling Progress</Heading>
          <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
            {currentIndex + 1} / {videos.length}
          </Badge>
        </HStack>
        <Progress value={progress} colorScheme="purple" size="sm" borderRadius="full" />
        <Text fontSize="sm" color="whiteAlpha.600" mt={1}>
          {remaining} videos remaining
        </Text>
      </Box>

      {/* Current Video */}
      <Card bg="whiteAlpha.100" borderColor="whiteAlpha.300" borderWidth="1px">
        <CardBody>
          <VStack spacing={4}>
            {/* Video Player */}
            <AspectRatio ratio={16/9} w="100%" maxW="800px" bg="black" borderRadius="md">
              {currentVideo?.thumbnailUrl ? (
                <video 
                  key={currentVideo.path}
                  controls 
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                >
                  <source src={`/api/thumbnail/${encodeURIComponent(currentVideo.path)}`} type="video/mp4" />
                  Your browser doesn't support video
                </video>
              ) : (
                <Box bg="gray.800" display="flex" alignItems="center" justifyContent="center">
                  <Text color="whiteAlpha.500">No preview available</Text>
                </Box>
              )}
            </AspectRatio>

            {/* Video Info */}
            <Box w="100%">
              <Text color="whiteAlpha.900" fontWeight="bold" fontSize="lg" noOfLines={1}>
                {currentVideo?.name}
              </Text>
              <Text color="whiteAlpha.600" fontSize="sm">
                {currentVideo?.folder}
              </Text>
              {currentVideo?.size && (
                <Text color="whiteAlpha.500" fontSize="xs">
                  {(currentVideo.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              )}
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Action Buttons */}
      <SimpleGrid columns={3} spacing={4}>
        <Button
          size="lg"
          colorScheme="green"
          leftIcon={<StarIcon />}
          onClick={labelHighlight}
          h="80px"
          fontSize="lg"
        >
          <Box>
            <Text>Highlight</Text>
            <Text fontSize="xs" fontWeight="normal"><Kbd>H</Kbd></Text>
          </Box>
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          colorScheme="gray"
          leftIcon={<CloseIcon />}
          onClick={labelNormal}
          h="80px"
          fontSize="lg"
          borderColor="whiteAlpha.400"
          color="whiteAlpha.900"
        >
          <Box>
            <Text>Normal/Skip</Text>
            <Text fontSize="xs" fontWeight="normal"><Kbd>N</Kbd> or <Kbd>Space</Kbd></Text>
          </Box>
        </Button>

        <Button
          size="lg"
          variant="ghost"
          leftIcon={<ArrowForwardIcon />}
          onClick={skip}
          h="80px"
          fontSize="lg"
          color="whiteAlpha.600"
        >
          <Box>
            <Text>Skip</Text>
            <Text fontSize="xs" fontWeight="normal"><Kbd>S</Kbd></Text>
          </Box>
        </Button>
      </SimpleGrid>

      {/* Stats */}
      <SimpleGrid columns={3} spacing={4}>
        <Card bg="green.900" borderColor="green.600" borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel color="green.100">Highlights</StatLabel>
              <StatNumber color="green.200">{labeled.highlights.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="whiteAlpha.100" borderColor="whiteAlpha.300" borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel color="whiteAlpha.700">Normal</StatLabel>
              <StatNumber color="whiteAlpha.900">{labeled.normal.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="purple.900" borderColor="purple.600" borderWidth="1px">
          <CardBody>
            <Stat>
              <StatLabel color="purple.100">Total Labeled</StatLabel>
              <StatNumber color="purple.200">
                {labeled.highlights.length + labeled.normal.length}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Save Button */}
      <HStack justify="flex-end">
        <Button
          variant="outline"
          onClick={() => setVideos([])}
          borderColor="whiteAlpha.400"
          color="whiteAlpha.900"
        >
          Start Over
        </Button>
        <Button
          colorScheme="purple"
          leftIcon={<CheckIcon />}
          onClick={finishLabeling}
          isLoading={saving}
          size="lg"
        >
          Save Labels & Continue
        </Button>
      </HStack>
    </VStack>
  );
}
