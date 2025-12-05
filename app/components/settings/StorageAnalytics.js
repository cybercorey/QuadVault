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
  Text,
  Heading,
  Badge,
  HStack
} from '@chakra-ui/react';

export default function StorageAnalyticsSettings({ settings, updateSetting }) {
  return (
    <VStack align="stretch" spacing={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="md" color="whiteAlpha.900">Storage Analytics & Reports</Heading>
        <Badge colorScheme={settings.storage_analytics.enabled ? 'green' : 'gray'} fontSize="md" px={3} py={1}>
          {settings.storage_analytics.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </HStack>
      
      <Text fontSize="sm" color="whiteAlpha.700" mb={2}>
        Advanced storage insights, charts, and duplicate detection.
      </Text>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Enable Storage Analytics</FormLabel>
        <Switch 
          isChecked={settings.storage_analytics.enabled}
          onChange={(e) => updateSetting('storage_analytics', 'enabled', e.target.checked)}
          colorScheme="purple"
          size="lg"
        />
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Compute Interval (hours)</FormLabel>
        <NumberInput 
          value={settings.storage_analytics.compute_interval_hours}
          onChange={(val) => updateSetting('storage_analytics', 'compute_interval_hours', parseInt(val))}
          min={1}
          max={168}
          isDisabled={!settings.storage_analytics.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          How often to recompute storage statistics
        </Text>
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Track Per-Device Usage</FormLabel>
        <Switch 
          isChecked={settings.storage_analytics.track_per_device}
          onChange={(e) => updateSetting('storage_analytics', 'track_per_device', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.storage_analytics.enabled}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Track File Types</FormLabel>
        <Switch 
          isChecked={settings.storage_analytics.track_file_types}
          onChange={(e) => updateSetting('storage_analytics', 'track_file_types', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.storage_analytics.enabled}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Duplicate Detection</FormLabel>
        <Switch 
          isChecked={settings.storage_analytics.duplicate_detection}
          onChange={(e) => updateSetting('storage_analytics', 'duplicate_detection', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.storage_analytics.enabled}
        />
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Duplicate Min Size (MB)</FormLabel>
        <NumberInput 
          value={settings.storage_analytics.duplicate_min_size_mb}
          onChange={(val) => updateSetting('storage_analytics', 'duplicate_min_size_mb', parseInt(val))}
          min={1}
          max={1000}
          isDisabled={!settings.storage_analytics.enabled || !settings.storage_analytics.duplicate_detection}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          Only check files larger than this size for duplicates
        </Text>
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Data Retention (days)</FormLabel>
        <NumberInput 
          value={settings.storage_analytics.retention_days}
          onChange={(val) => updateSetting('storage_analytics', 'retention_days', parseInt(val))}
          min={7}
          max={3650}
          isDisabled={!settings.storage_analytics.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          How long to keep historical analytics data
        </Text>
      </FormControl>
    </VStack>
  );
}
