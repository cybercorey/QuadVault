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
  Card,
  CardHeader,
  CardBody,
  Badge,
  IconButton,
  List,
  ListItem,
  useToast,
  Alert,
  AlertIcon,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, CheckIcon } from '@chakra-ui/icons';

export default function LabelManager({ onLabelsReady }) {
  const toast = useToast();
  const [highlightPaths, setHighlightPaths] = useState(['']);
  const [normalPaths, setNormalPaths] = useState(['']);
  const [savePath, setSavePath] = useState('/media/labels.json');
  const [existingLabels, setExistingLabels] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load existing labels if they exist
  useEffect(() => {
    loadExistingLabels();
  }, []);

  const loadExistingLabels = async () => {
    try {
      const res = await fetch('/api/ai-load-labels?path=/media/labels.json');
      if (res.ok) {
        const data = await res.json();
        if (data.labels) {
          setExistingLabels(data.labels);
          setHighlightPaths(data.labels.highlights || ['']);
          setNormalPaths(data.labels.normal || ['']);
          toast({
            title: 'Labels Loaded',
            description: `Found ${data.labels.highlights?.length || 0} highlights, ${data.labels.normal?.length || 0} normal`,
            status: 'success',
            duration: 3000,
          });
        }
      }
    } catch (err) {
      // File doesn't exist yet, that's okay
    }
  };

  const addHighlight = () => {
    setHighlightPaths([...highlightPaths, '']);
  };

  const addNormal = () => {
    setNormalPaths([...normalPaths, '']);
  };

  const removeHighlight = (index) => {
    setHighlightPaths(highlightPaths.filter((_, i) => i !== index));
  };

  const removeNormal = (index) => {
    setNormalPaths(normalPaths.filter((_, i) => i !== index));
  };

  const updateHighlight = (index, value) => {
    const updated = [...highlightPaths];
    updated[index] = value;
    setHighlightPaths(updated);
  };

  const updateNormal = (index, value) => {
    const updated = [...normalPaths];
    updated[index] = value;
    setNormalPaths(updated);
  };

  const saveLabels = async () => {
    // Filter out empty paths
    const highlights = highlightPaths.filter(p => p.trim() !== '');
    const normal = normalPaths.filter(p => p.trim() !== '');

    if (highlights.length === 0 || normal.length === 0) {
      toast({
        title: 'Invalid Labels',
        description: 'You need at least one highlight and one normal video',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai-save-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: savePath,
          labels: { highlights, normal }
        })
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Labels Saved!',
          description: `Saved ${highlights.length} highlights and ${normal.length} normal videos to ${savePath}`,
          status: 'success',
          duration: 5000,
        });
        setExistingLabels({ highlights, normal });
        if (onLabelsReady) {
          onLabelsReady(savePath);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const quickFill = () => {
    setHighlightPaths([
      '/media/2024/epic_sunset.mp4',
      '/media/2024/proximity_flight.mp4',
      '/media/2023/waterfall_dive.mp4',
      ''
    ]);
    setNormalPaths([
      '/media/2024/takeoff_test.mp4',
      '/media/2024/battery_check.mp4',
      '/media/2023/boring_transit.mp4',
      ''
    ]);
    toast({
      title: 'Example Loaded',
      description: 'Edit the paths to match your actual video files',
      status: 'info',
      duration: 3000,
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <HStack justify="space-between" mb={4}>
          <Box>
            <Heading size="md">Label Your Videos</Heading>
            <Text color="gray.400" fontSize="sm">
              Classify videos as highlights or normal to train the AI
            </Text>
          </Box>
          <Button size="sm" variant="outline" onClick={quickFill}>
            Load Example
          </Button>
        </HStack>

        {existingLabels && (
          <Alert status="success" mb={4}>
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Existing Labels Found</Text>
              <Text fontSize="sm">
                {existingLabels.highlights.length} highlights, {existingLabels.normal.length} normal videos
              </Text>
            </Box>
          </Alert>
        )}
      </Box>

      <SimpleGrid columns={2} spacing={6}>
        {/* Highlights Column */}
        <Card bg="whiteAlpha.50">
          <CardHeader>
            <HStack justify="space-between">
              <Box>
                <Heading size="sm">Highlights</Heading>
                <Text fontSize="xs" color="gray.400">Your best footage</Text>
              </Box>
              <Badge colorScheme="green">{highlightPaths.filter(p => p).length}</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={2} align="stretch">
              {highlightPaths.map((path, idx) => (
                <HStack key={idx}>
                  <Input
                    size="sm"
                    placeholder="/media/folder/epic_video.mp4"
                    value={path}
                    onChange={(e) => updateHighlight(idx, e.target.value)}
                  />
                  <IconButton
                    size="sm"
                    icon={<DeleteIcon />}
                    onClick={() => removeHighlight(idx)}
                    isDisabled={highlightPaths.length === 1}
                  />
                </HStack>
              ))}
              <Button
                size="sm"
                leftIcon={<AddIcon />}
                onClick={addHighlight}
                variant="ghost"
                colorScheme="green"
              >
                Add Highlight
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Normal Column */}
        <Card bg="whiteAlpha.50">
          <CardHeader>
            <HStack justify="space-between">
              <Box>
                <Heading size="sm">Normal</Heading>
                <Text fontSize="xs" color="gray.400">Regular footage</Text>
              </Box>
              <Badge colorScheme="gray">{normalPaths.filter(p => p).length}</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={2} align="stretch">
              {normalPaths.map((path, idx) => (
                <HStack key={idx}>
                  <Input
                    size="sm"
                    placeholder="/media/folder/normal_video.mp4"
                    value={path}
                    onChange={(e) => updateNormal(idx, e.target.value)}
                  />
                  <IconButton
                    size="sm"
                    icon={<DeleteIcon />}
                    onClick={() => removeNormal(idx)}
                    isDisabled={normalPaths.length === 1}
                  />
                </HStack>
              ))}
              <Button
                size="sm"
                leftIcon={<AddIcon />}
                onClick={addNormal}
                variant="ghost"
              >
                Add Normal
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Divider />

      <FormControl>
        <FormLabel>Save Path</FormLabel>
        <Input
          value={savePath}
          onChange={(e) => setSavePath(e.target.value)}
          placeholder="/media/labels.json"
        />
        <Text fontSize="xs" color="gray.400" mt={1}>
          This file will be saved in your Samba mount
        </Text>
      </FormControl>

      <Alert status="info">
        <AlertIcon />
        <Box fontSize="sm">
          <Text fontWeight="bold">Tips for Labeling:</Text>
          <List spacing={1} mt={2}>
            <ListItem>• Start with 50-100 videos (25-50 of each type)</ListItem>
            <ListItem>• Use full paths: /media/folder/video.mp4</ListItem>
            <ListItem>• Highlights: Epic scenery, action, technical skill</ListItem>
            <ListItem>• Normal: Takeoffs, tests, boring transit footage</ListItem>
          </List>
        </Box>
      </Alert>

      <HStack justify="flex-end">
        <Button
          colorScheme="purple"
          onClick={saveLabels}
          isLoading={loading}
          leftIcon={<CheckIcon />}
        >
          Save Labels & Continue
        </Button>
      </HStack>
    </VStack>
  );
}
