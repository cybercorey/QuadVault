import { 
  VStack, 
  FormControl, 
  FormLabel, 
  Switch, 
  NumberInput, 
  NumberInputField, 
  NumberInputStepper, 
  NumberIncrementStepper, 
  NumberDecrementStepper,
  Select,
  Input,
  Text,
  Heading,
  Badge,
  HStack,
  Button,
  InputGroup,
  InputRightElement,
  Icon
} from '@chakra-ui/react';
import { FiFolder } from 'react-icons/fi';
import { useState, useRef } from 'react';

export default function AISettings({ settings, updateSetting }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const labelsPathRef = useRef(null);
  const modelPathRef = useRef(null);

  function handleBrowseLabels() {
    // In a real implementation, this would open a file browser dialog
    // For now, just focus the input
    labelsPathRef.current?.focus();
  }

  function handleBrowseModel() {
    modelPathRef.current?.focus();
  }

  return (
    <VStack align="stretch" spacing={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="md" color="whiteAlpha.900">AI Training & Classification</Heading>
        <Badge colorScheme={settings.ai_scene_detection?.enabled ? 'green' : 'gray'} fontSize="md" px={3} py={1}>
          {settings.ai_scene_detection?.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </HStack>
      
      <Text fontSize="sm" color="whiteAlpha.700" mb={2}>
        Configure paths for AI training datasets, models, and labels. See the AI Training tab for the full workflow.
      </Text>

      {/* File Paths Section */}
      <VStack align="stretch" spacing={4} bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <Heading size="sm" color="whiteAlpha.900">File Paths</Heading>
        
        <FormControl>
          <FormLabel color="whiteAlpha.900" fontWeight="600">Labels File Path</FormLabel>
          <InputGroup>
            <Input 
              ref={labelsPathRef}
              type="text"
              placeholder="/media/labels.json"
              value={settings.ai_training?.labels_path || '/media/labels.json'}
              onChange={(e) => updateSetting('ai_training', 'labels_path', e.target.value)}
              bg="whiteAlpha.300"
              borderColor="whiteAlpha.500"
              color="white"
              _placeholder={{ color: 'whiteAlpha.500' }}
            />
            <InputRightElement width="4rem">
              <Button h="1.75rem" size="sm" onClick={handleBrowseLabels} bg="whiteAlpha.400" _hover={{ bg: 'whiteAlpha.500' }}>
                <Icon as={FiFolder} color="white" />
              </Button>
            </InputRightElement>
          </InputGroup>
          <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
            Path to your labels.json file (created in AI Training → Label Videos)
          </Text>
        </FormControl>

        <FormControl>
          <FormLabel color="whiteAlpha.900" fontWeight="600">Library Path (for scanning)</FormLabel>
          <InputGroup>
            <Input 
              type="text"
              placeholder="/media"
              value={settings.ai_training?.library_path || '/media'}
              onChange={(e) => updateSetting('ai_training', 'library_path', e.target.value)}
              bg="whiteAlpha.300"
              borderColor="whiteAlpha.500"
              color="white"
              _placeholder={{ color: 'whiteAlpha.500' }}
            />
            <InputRightElement width="4rem">
              <Button h="1.75rem" size="sm" onClick={handleBrowseModel} bg="whiteAlpha.400" _hover={{ bg: 'whiteAlpha.500' }}>
                <Icon as={FiFolder} color="white" />
              </Button>
            </InputRightElement>
          </InputGroup>
          <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
            Root directory containing your video files
          </Text>
        </FormControl>

        <FormControl>
          <FormLabel color="whiteAlpha.900" fontWeight="600">Trained Model Path</FormLabel>
          <InputGroup>
            <Input 
              ref={modelPathRef}
              type="text"
              placeholder="/tmp/training/model.pth"
              value={settings.ai_training?.model_path || '/tmp/training/model.pth'}
              onChange={(e) => updateSetting('ai_training', 'model_path', e.target.value)}
              bg="whiteAlpha.300"
              borderColor="whiteAlpha.500"
              color="white"
              _placeholder={{ color: 'whiteAlpha.500' }}
            />
            <InputRightElement width="4rem">
              <Button h="1.75rem" size="sm" onClick={handleBrowseModel} bg="whiteAlpha.400" _hover={{ bg: 'whiteAlpha.500' }}>
                <Icon as={FiFolder} color="white" />
              </Button>
            </InputRightElement>
          </InputGroup>
          <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
            Path where your custom trained model will be saved
          </Text>
        </FormControl>
      </VStack>

      {/* AI Model Settings */}
      <VStack align="stretch" spacing={4} bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <Heading size="sm" color="whiteAlpha.900">Model Configuration</Heading>

        <FormControl>
          <FormLabel color="whiteAlpha.900" fontWeight="600">AI Provider</FormLabel>
          <Select 
            value={settings.ai_scene_detection?.provider || 'local'}
            onChange={(e) => updateSetting('ai_scene_detection', 'provider', e.target.value)}
            bg="whiteAlpha.300"
            borderColor="whiteAlpha.500"
            color="white"
          >
            <option value="local" style={{ background: '#1a202c' }}>Local Model (CLIP) - Free</option>
            <option value="custom" style={{ background: '#1a202c' }}>Custom Trained Model</option>
            <option value="openai" style={{ background: '#1a202c' }}>OpenAI Vision API (Paid)</option>
            <option value="disabled" style={{ background: '#1a202c' }}>Disabled</option>
          </Select>
          <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
            Choose which AI model to use for classification
          </Text>
        </FormControl>

        {settings.ai_scene_detection?.provider === 'openai' && (
          <FormControl>
            <FormLabel color="whiteAlpha.900" fontWeight="600">OpenAI API Key</FormLabel>
            <InputGroup>
              <Input 
                type={showApiKey ? "text" : "password"}
                placeholder="sk-..."
                value={settings.ai_scene_detection?.openai_api_key || ''}
                onChange={(e) => updateSetting('ai_scene_detection', 'openai_api_key', e.target.value)}
                bg="whiteAlpha.300"
                borderColor="whiteAlpha.500"
                color="white"
                _placeholder={{ color: 'whiteAlpha.500' }}
              />
              <InputRightElement width="4rem">
                <Button h="1.75rem" size="sm" onClick={() => setShowApiKey(!showApiKey)} bg="whiteAlpha.400" _hover={{ bg: 'whiteAlpha.500' }}>
                  <Text color="white" fontSize="xs">{showApiKey ? "Hide" : "Show"}</Text>
                </Button>
              </InputRightElement>
            </InputGroup>
          </FormControl>
        )}

        <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
          <FormLabel color="whiteAlpha.900" fontWeight="600">Min Scene Duration (seconds)</FormLabel>
          <NumberInput 
            value={settings.ai_scene_detection?.min_scene_duration_sec || 3}
            onChange={(val) => updateSetting('ai_scene_detection', 'min_scene_duration_sec', parseInt(val))}
            min={1}
            max={30}
          >
            <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
            <NumberInputStepper>
              <NumberIncrementStepper color="whiteAlpha.900" />
              <NumberDecrementStepper color="whiteAlpha.900" />
            </NumberInputStepper>
          </NumberInput>
          <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
            Minimum duration for a clip to be considered a highlight
          </Text>
        </FormControl>

        <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
          <FormLabel color="whiteAlpha.900" fontWeight="600">Frame Extract Interval (seconds)</FormLabel>
          <NumberInput 
            value={settings.ai_scene_detection?.extract_frame_interval_sec || 2}
            onChange={(val) => updateSetting('ai_scene_detection', 'extract_frame_interval_sec', parseInt(val))}
            min={1}
            max={10}
          >
            <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
            <NumberInputStepper>
              <NumberIncrementStepper color="whiteAlpha.900" />
              <NumberDecrementStepper color="whiteAlpha.900" />
            </NumberInputStepper>
          </NumberInput>
          <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
            Extract a frame every N seconds for AI analysis
          </Text>
        </FormControl>
      </VStack>

      {/* Auto-Highlight Settings */}
      <VStack align="stretch" spacing={4} bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <Heading size="sm" color="whiteAlpha.900">Auto-Highlight Generation</Heading>

        <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
          <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Auto-Generate Highlights</FormLabel>
          <Switch 
            isChecked={settings.ai_scene_detection?.auto_generate_highlights ?? true}
            onChange={(e) => updateSetting('ai_scene_detection', 'auto_generate_highlights', e.target.checked)}
            colorScheme="purple"
            size="lg"
          />
        </FormControl>

        <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
          <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">One Highlight Per Flight</FormLabel>
          <Switch 
            isChecked={settings.ai_scene_detection?.highlight_per_flight ?? true}
            onChange={(e) => updateSetting('ai_scene_detection', 'highlight_per_flight', e.target.checked)}
            colorScheme="purple"
            size="lg"
          />
        </FormControl>
      </VStack>
    </VStack>
  );
}
