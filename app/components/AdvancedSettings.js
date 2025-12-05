import { 
  Box, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Switch, 
  FormControl, 
  FormLabel, 
  NumberInput, 
  NumberInputField, 
  NumberInputStepper, 
  NumberIncrementStepper, 
  NumberDecrementStepper,
  Select,
  Input,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
  Badge,
  Button,
  useToast
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

export default function AdvancedSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState({
    // Multi-Device Parallel Processing
    parallel_processing: {
      enabled: false,
      max_concurrent_devices: 2,
      max_concurrent_jobs: 4,
      priority_mode: 'fifo', // fifo, size, device
      per_device_bandwidth_limit_mbps: 0, // 0 = unlimited
    },
    
    // Storage Analytics
    storage_analytics: {
      enabled: true,
      compute_interval_hours: 24,
      track_per_device: true,
      track_file_types: true,
      duplicate_detection: true,
      duplicate_min_size_mb: 10,
      retention_days: 365,
    },
    
    // Incremental Sync
    incremental_sync: {
      enabled: false,
      hash_algorithm: 'xxhash', // xxhash, md5, sha256
      skip_unchanged: true,
      verify_size_only: false, // faster but less accurate
      cache_expiry_days: 30,
      rescan_threshold_percent: 10, // rescan if >10% of files changed
    },
    
    // AI Scene Detection
    ai_scene_detection: {
      enabled: false,
      provider: 'openai', // openai, local, disabled
      openai_api_key: '',
      scene_threshold: 0.7, // 0-1, higher = more selective
      min_scene_duration_sec: 3,
      max_highlight_duration_sec: 60,
      auto_generate_highlights: true,
      highlight_per_flight: true,
      detect_categories: ['sunset', 'action', 'landscape', 'smooth_flight', 'proximity'],
      extract_frame_interval_sec: 2,
    },
    
    // 3D Flight Path
    flight_path_3d: {
      enabled: false,
      parse_telemetry: true,
      supported_formats: ['dji_srt', 'gopro_gpmf', 'insta360'],
      map_provider: 'mapbox', // mapbox, cesium, leaflet
      mapbox_token: '',
      default_altitude_meters: 100,
      path_color: '#8b5cf6',
      show_waypoints: true,
      show_altitude_graph: true,
      export_kml: false,
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/advanced-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings({ ...settings, ...data.settings });
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch('/api/advanced-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      
      if (res.ok) {
        toast({
          title: 'Settings saved',
          status: 'success',
          duration: 2000
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(category, key, value) {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  }

  if (loading) {
    return <Text color="whiteAlpha.600">Loading settings...</Text>;
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Accordion allowMultiple defaultIndex={[0, 1, 2, 3, 4]}>
        
        {/* Multi-Device Parallel Processing */}
        <AccordionItem 
          border="1px solid" 
          borderColor="whiteAlpha.200" 
          borderRadius="md" 
          mb={4}
          bg="whiteAlpha.50"
        >
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <HStack>
                <Heading size="sm">Multi-Device Parallel Processing</Heading>
                <Badge colorScheme={settings.parallel_processing.enabled ? 'green' : 'gray'}>
                  {settings.parallel_processing.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.600" mt={1}>
                Process multiple USB drives simultaneously
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Enable Parallel Processing</FormLabel>
                <Switch 
                  isChecked={settings.parallel_processing.enabled}
                  onChange={(e) => updateSetting('parallel_processing', 'enabled', e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Max Concurrent Devices</FormLabel>
                <NumberInput 
                  value={settings.parallel_processing.max_concurrent_devices}
                  onChange={(val) => updateSetting('parallel_processing', 'max_concurrent_devices', parseInt(val))}
                  min={1}
                  max={8}
                  isDisabled={!settings.parallel_processing.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  How many USB drives can sync at the same time
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Max Concurrent Jobs (Total)</FormLabel>
                <NumberInput 
                  value={settings.parallel_processing.max_concurrent_jobs}
                  onChange={(val) => updateSetting('parallel_processing', 'max_concurrent_jobs', parseInt(val))}
                  min={1}
                  max={16}
                  isDisabled={!settings.parallel_processing.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Total jobs (sync/merge/stabilize) running simultaneously
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Priority Mode</FormLabel>
                <Select 
                  value={settings.parallel_processing.priority_mode}
                  onChange={(e) => updateSetting('parallel_processing', 'priority_mode', e.target.value)}
                  isDisabled={!settings.parallel_processing.enabled}
                >
                  <option value="fifo">First In First Out (FIFO)</option>
                  <option value="size">Smallest Files First</option>
                  <option value="device">Device Priority Order</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Per-Device Bandwidth Limit (MB/s)</FormLabel>
                <NumberInput 
                  value={settings.parallel_processing.per_device_bandwidth_limit_mbps}
                  onChange={(val) => updateSetting('parallel_processing', 'per_device_bandwidth_limit_mbps', parseInt(val))}
                  min={0}
                  max={1000}
                  isDisabled={!settings.parallel_processing.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  0 = unlimited, useful to prevent network saturation
                </Text>
              </FormControl>
            </VStack>
          </AccordionPanel>
        </AccordionItem>

        {/* Storage Analytics */}
        <AccordionItem 
          border="1px solid" 
          borderColor="whiteAlpha.200" 
          borderRadius="md" 
          mb={4}
          bg="whiteAlpha.50"
        >
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <HStack>
                <Heading size="sm">Storage Analytics & Reports</Heading>
                <Badge colorScheme={settings.storage_analytics.enabled ? 'green' : 'gray'}>
                  {settings.storage_analytics.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.600" mt={1}>
                Advanced storage insights, charts, and duplicate detection
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Enable Storage Analytics</FormLabel>
                <Switch 
                  isChecked={settings.storage_analytics.enabled}
                  onChange={(e) => updateSetting('storage_analytics', 'enabled', e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Compute Interval (hours)</FormLabel>
                <NumberInput 
                  value={settings.storage_analytics.compute_interval_hours}
                  onChange={(val) => updateSetting('storage_analytics', 'compute_interval_hours', parseInt(val))}
                  min={1}
                  max={168}
                  isDisabled={!settings.storage_analytics.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  How often to recompute storage statistics
                </Text>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Track Per-Device Usage</FormLabel>
                <Switch 
                  isChecked={settings.storage_analytics.track_per_device}
                  onChange={(e) => updateSetting('storage_analytics', 'track_per_device', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.storage_analytics.enabled}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Track File Types</FormLabel>
                <Switch 
                  isChecked={settings.storage_analytics.track_file_types}
                  onChange={(e) => updateSetting('storage_analytics', 'track_file_types', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.storage_analytics.enabled}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Duplicate Detection</FormLabel>
                <Switch 
                  isChecked={settings.storage_analytics.duplicate_detection}
                  onChange={(e) => updateSetting('storage_analytics', 'duplicate_detection', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.storage_analytics.enabled}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Duplicate Min Size (MB)</FormLabel>
                <NumberInput 
                  value={settings.storage_analytics.duplicate_min_size_mb}
                  onChange={(val) => updateSetting('storage_analytics', 'duplicate_min_size_mb', parseInt(val))}
                  min={1}
                  max={1000}
                  isDisabled={!settings.storage_analytics.enabled || !settings.storage_analytics.duplicate_detection}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Only check files larger than this size for duplicates
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Data Retention (days)</FormLabel>
                <NumberInput 
                  value={settings.storage_analytics.retention_days}
                  onChange={(val) => updateSetting('storage_analytics', 'retention_days', parseInt(val))}
                  min={7}
                  max={3650}
                  isDisabled={!settings.storage_analytics.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  How long to keep historical analytics data
                </Text>
              </FormControl>
            </VStack>
          </AccordionPanel>
        </AccordionItem>

        {/* Incremental Sync */}
        <AccordionItem 
          border="1px solid" 
          borderColor="whiteAlpha.200" 
          borderRadius="md" 
          mb={4}
          bg="whiteAlpha.50"
        >
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <HStack>
                <Heading size="sm">Incremental Sync / Smart Delta Detection</Heading>
                <Badge colorScheme={settings.incremental_sync.enabled ? 'green' : 'gray'}>
                  {settings.incremental_sync.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.600" mt={1}>
                Skip unchanged files to speed up syncs
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Enable Incremental Sync</FormLabel>
                <Switch 
                  isChecked={settings.incremental_sync.enabled}
                  onChange={(e) => updateSetting('incremental_sync', 'enabled', e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Hash Algorithm</FormLabel>
                <Select 
                  value={settings.incremental_sync.hash_algorithm}
                  onChange={(e) => updateSetting('incremental_sync', 'hash_algorithm', e.target.value)}
                  isDisabled={!settings.incremental_sync.enabled}
                >
                  <option value="xxhash">xxHash (fastest, recommended)</option>
                  <option value="md5">MD5 (balanced)</option>
                  <option value="sha256">SHA-256 (most secure, slowest)</option>
                </Select>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Algorithm for file comparison
                </Text>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Skip Unchanged Files</FormLabel>
                <Switch 
                  isChecked={settings.incremental_sync.skip_unchanged}
                  onChange={(e) => updateSetting('incremental_sync', 'skip_unchanged', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.incremental_sync.enabled}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Verify Size Only (Fast Mode)</FormLabel>
                <Switch 
                  isChecked={settings.incremental_sync.verify_size_only}
                  onChange={(e) => updateSetting('incremental_sync', 'verify_size_only', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.incremental_sync.enabled}
                />
              </FormControl>
              <Text fontSize="xs" color="whiteAlpha.500" mt={-2}>
                Only compare file sizes instead of hashes (faster but less accurate)
              </Text>

              <FormControl>
                <FormLabel>Cache Expiry (days)</FormLabel>
                <NumberInput 
                  value={settings.incremental_sync.cache_expiry_days}
                  onChange={(val) => updateSetting('incremental_sync', 'cache_expiry_days', parseInt(val))}
                  min={1}
                  max={365}
                  isDisabled={!settings.incremental_sync.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  How long to remember file hashes
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Rescan Threshold (%)</FormLabel>
                <NumberInput 
                  value={settings.incremental_sync.rescan_threshold_percent}
                  onChange={(val) => updateSetting('incremental_sync', 'rescan_threshold_percent', parseInt(val))}
                  min={1}
                  max={100}
                  isDisabled={!settings.incremental_sync.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Force full rescan if more than this % of files changed
                </Text>
              </FormControl>
            </VStack>
          </AccordionPanel>
        </AccordionItem>

        {/* AI Scene Detection */}
        <AccordionItem 
          border="1px solid" 
          borderColor="whiteAlpha.200" 
          borderRadius="md" 
          mb={4}
          bg="whiteAlpha.50"
        >
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <HStack>
                <Heading size="sm">AI Scene Detection & Auto-Highlights</Heading>
                <Badge colorScheme={settings.ai_scene_detection.enabled ? 'green' : 'gray'}>
                  {settings.ai_scene_detection.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.600" mt={1}>
                Automatically detect epic scenes and create highlight reels
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Enable AI Scene Detection</FormLabel>
                <Switch 
                  isChecked={settings.ai_scene_detection.enabled}
                  onChange={(e) => updateSetting('ai_scene_detection', 'enabled', e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>

              <FormControl>
                <FormLabel>AI Provider</FormLabel>
                <Select 
                  value={settings.ai_scene_detection.provider}
                  onChange={(e) => updateSetting('ai_scene_detection', 'provider', e.target.value)}
                  isDisabled={!settings.ai_scene_detection.enabled}
                >
                  <option value="openai">OpenAI Vision API</option>
                  <option value="local">Local Model (CLIP)</option>
                  <option value="disabled">Disabled</option>
                </Select>
              </FormControl>

              {settings.ai_scene_detection.provider === 'openai' && (
                <FormControl>
                  <FormLabel>OpenAI API Key</FormLabel>
                  <Input 
                    type="password"
                    placeholder="sk-..."
                    value={settings.ai_scene_detection.openai_api_key}
                    onChange={(e) => updateSetting('ai_scene_detection', 'openai_api_key', e.target.value)}
                    isDisabled={!settings.ai_scene_detection.enabled}
                  />
                </FormControl>
              )}

              <FormControl>
                <FormLabel>
                  Scene Threshold: {settings.ai_scene_detection.scene_threshold.toFixed(2)}
                </FormLabel>
                <Slider 
                  value={settings.ai_scene_detection.scene_threshold}
                  onChange={(val) => updateSetting('ai_scene_detection', 'scene_threshold', val)}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  isDisabled={!settings.ai_scene_detection.enabled}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="purple.400" />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Higher = more selective (only very interesting scenes)
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Min Scene Duration (seconds)</FormLabel>
                <NumberInput 
                  value={settings.ai_scene_detection.min_scene_duration_sec}
                  onChange={(val) => updateSetting('ai_scene_detection', 'min_scene_duration_sec', parseInt(val))}
                  min={1}
                  max={30}
                  isDisabled={!settings.ai_scene_detection.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Max Highlight Duration (seconds)</FormLabel>
                <NumberInput 
                  value={settings.ai_scene_detection.max_highlight_duration_sec}
                  onChange={(val) => updateSetting('ai_scene_detection', 'max_highlight_duration_sec', parseInt(val))}
                  min={10}
                  max={300}
                  isDisabled={!settings.ai_scene_detection.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Auto-Generate Highlights</FormLabel>
                <Switch 
                  isChecked={settings.ai_scene_detection.auto_generate_highlights}
                  onChange={(e) => updateSetting('ai_scene_detection', 'auto_generate_highlights', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.ai_scene_detection.enabled}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>One Highlight Per Flight</FormLabel>
                <Switch 
                  isChecked={settings.ai_scene_detection.highlight_per_flight}
                  onChange={(e) => updateSetting('ai_scene_detection', 'highlight_per_flight', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.ai_scene_detection.enabled}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Frame Extract Interval (seconds)</FormLabel>
                <NumberInput 
                  value={settings.ai_scene_detection.extract_frame_interval_sec}
                  onChange={(val) => updateSetting('ai_scene_detection', 'extract_frame_interval_sec', parseInt(val))}
                  min={1}
                  max={10}
                  isDisabled={!settings.ai_scene_detection.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Extract a frame every N seconds for AI analysis
                </Text>
              </FormControl>
            </VStack>
          </AccordionPanel>
        </AccordionItem>

        {/* 3D Flight Path */}
        <AccordionItem 
          border="1px solid" 
          borderColor="whiteAlpha.200" 
          borderRadius="md" 
          mb={4}
          bg="whiteAlpha.50"
        >
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <HStack>
                <Heading size="sm">3D Flight Path Visualization</Heading>
                <Badge colorScheme={settings.flight_path_3d.enabled ? 'green' : 'gray'}>
                  {settings.flight_path_3d.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.600" mt={1}>
                Parse GPS telemetry and render 3D flight paths
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <VStack align="stretch" spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Enable Flight Path Visualization</FormLabel>
                <Switch 
                  isChecked={settings.flight_path_3d.enabled}
                  onChange={(e) => updateSetting('flight_path_3d', 'enabled', e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Parse Telemetry Data</FormLabel>
                <Switch 
                  isChecked={settings.flight_path_3d.parse_telemetry}
                  onChange={(e) => updateSetting('flight_path_3d', 'parse_telemetry', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.flight_path_3d.enabled}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Map Provider</FormLabel>
                <Select 
                  value={settings.flight_path_3d.map_provider}
                  onChange={(e) => updateSetting('flight_path_3d', 'map_provider', e.target.value)}
                  isDisabled={!settings.flight_path_3d.enabled}
                >
                  <option value="mapbox">Mapbox GL (Recommended)</option>
                  <option value="cesium">Cesium (Full 3D)</option>
                  <option value="leaflet">Leaflet (2D, Free)</option>
                </Select>
              </FormControl>

              {settings.flight_path_3d.map_provider === 'mapbox' && (
                <FormControl>
                  <FormLabel>Mapbox Access Token</FormLabel>
                  <Input 
                    type="password"
                    placeholder="pk.eyJ..."
                    value={settings.flight_path_3d.mapbox_token}
                    onChange={(e) => updateSetting('flight_path_3d', 'mapbox_token', e.target.value)}
                    isDisabled={!settings.flight_path_3d.enabled}
                  />
                  <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                    Get free token at mapbox.com
                  </Text>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Default Altitude (meters)</FormLabel>
                <NumberInput 
                  value={settings.flight_path_3d.default_altitude_meters}
                  onChange={(val) => updateSetting('flight_path_3d', 'default_altitude_meters', parseInt(val))}
                  min={0}
                  max={500}
                  isDisabled={!settings.flight_path_3d.enabled}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Used when telemetry has no altitude data
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Path Color</FormLabel>
                <Input 
                  type="color"
                  value={settings.flight_path_3d.path_color}
                  onChange={(e) => updateSetting('flight_path_3d', 'path_color', e.target.value)}
                  isDisabled={!settings.flight_path_3d.enabled}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Show Waypoints</FormLabel>
                <Switch 
                  isChecked={settings.flight_path_3d.show_waypoints}
                  onChange={(e) => updateSetting('flight_path_3d', 'show_waypoints', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.flight_path_3d.enabled}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Show Altitude Graph</FormLabel>
                <Switch 
                  isChecked={settings.flight_path_3d.show_altitude_graph}
                  onChange={(e) => updateSetting('flight_path_3d', 'show_altitude_graph', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.flight_path_3d.enabled}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Export KML Files</FormLabel>
                <Switch 
                  isChecked={settings.flight_path_3d.export_kml}
                  onChange={(e) => updateSetting('flight_path_3d', 'export_kml', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={!settings.flight_path_3d.enabled}
                />
              </FormControl>
              <Text fontSize="xs" color="whiteAlpha.500" mt={-2}>
                Save flight paths as KML for Google Earth
              </Text>
            </VStack>
          </AccordionPanel>
        </AccordionItem>

      </Accordion>

      <Divider borderColor="whiteAlpha.300" />

      <HStack justify="flex-end" pt={2}>
        <Button 
          onClick={saveSettings}
          isLoading={saving}
          background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
          color="white"
          _hover={{ opacity: 0.9 }}
          size="lg"
        >
          Save All Settings
        </Button>
      </HStack>
    </VStack>
  );
}
