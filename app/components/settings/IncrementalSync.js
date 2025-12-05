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
  Text,
  Heading,
  Badge,
  HStack
} from '@chakra-ui/react';

export default function IncrementalSyncSettings({ settings, updateSetting }) {
  return (
    <VStack align="stretch" spacing={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="md" color="whiteAlpha.900">Incremental Sync / Smart Delta Detection</Heading>
        <Badge colorScheme={settings.incremental_sync.enabled ? 'green' : 'gray'} fontSize="md" px={3} py={1}>
          {settings.incremental_sync.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </HStack>
      
      <Text fontSize="sm" color="whiteAlpha.700" mb={2}>
        Skip unchanged files to speed up syncs using hash-based comparison.
      </Text>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Enable Incremental Sync</FormLabel>
        <Switch 
          isChecked={settings.incremental_sync.enabled}
          onChange={(e) => updateSetting('incremental_sync', 'enabled', e.target.checked)}
          colorScheme="purple"
          size="lg"
        />
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Hash Algorithm</FormLabel>
        <Select 
          value={settings.incremental_sync.hash_algorithm}
          onChange={(e) => updateSetting('incremental_sync', 'hash_algorithm', e.target.value)}
          isDisabled={!settings.incremental_sync.enabled}
          bg="whiteAlpha.300"
          borderColor="whiteAlpha.500"
          color="white"
        >
          <option value="xxhash" style={{ background: '#1a202c' }}>xxHash (fastest, recommended)</option>
          <option value="md5" style={{ background: '#1a202c' }}>MD5 (balanced)</option>
          <option value="sha256" style={{ background: '#1a202c' }}>SHA-256 (most secure, slowest)</option>
        </Select>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          Algorithm for file comparison
        </Text>
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Skip Unchanged Files</FormLabel>
        <Switch 
          isChecked={settings.incremental_sync.skip_unchanged}
          onChange={(e) => updateSetting('incremental_sync', 'skip_unchanged', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.incremental_sync.enabled}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Verify Size Only (Fast Mode)</FormLabel>
        <Switch 
          isChecked={settings.incremental_sync.verify_size_only}
          onChange={(e) => updateSetting('incremental_sync', 'verify_size_only', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.incremental_sync.enabled}
        />
      </FormControl>
      <Text fontSize="xs" color="whiteAlpha.600" mt={-4} ml={4}>
        Only compare file sizes instead of hashes (faster but less accurate)
      </Text>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Cache Expiry (days)</FormLabel>
        <NumberInput 
          value={settings.incremental_sync.cache_expiry_days}
          onChange={(val) => updateSetting('incremental_sync', 'cache_expiry_days', parseInt(val))}
          min={1}
          max={365}
          isDisabled={!settings.incremental_sync.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          How long to remember file hashes
        </Text>
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Rescan Threshold (%)</FormLabel>
        <NumberInput 
          value={settings.incremental_sync.rescan_threshold_percent}
          onChange={(val) => updateSetting('incremental_sync', 'rescan_threshold_percent', parseInt(val))}
          min={1}
          max={100}
          isDisabled={!settings.incremental_sync.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          Force full rescan if more than this % of files changed
        </Text>
      </FormControl>
    </VStack>
  );
}
