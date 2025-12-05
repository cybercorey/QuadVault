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

export default function ParallelProcessing({ settings, updateSetting }) {
  return (
    <VStack align="stretch" spacing={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="md" color="whiteAlpha.900">Multi-Device Parallel Processing</Heading>
        <Badge colorScheme={settings.parallel_processing.enabled ? 'green' : 'gray'} fontSize="md" px={3} py={1}>
          {settings.parallel_processing.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </HStack>
      
      <Text fontSize="sm" color="whiteAlpha.700" mb={2}>
        Process multiple USB drives simultaneously for faster workflow.
      </Text>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Enable Parallel Processing</FormLabel>
        <Switch 
          isChecked={settings.parallel_processing.enabled}
          onChange={(e) => updateSetting('parallel_processing', 'enabled', e.target.checked)}
          colorScheme="purple"
          size="lg"
        />
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Max Concurrent Devices</FormLabel>
        <NumberInput 
          value={settings.parallel_processing.max_concurrent_devices}
          onChange={(val) => updateSetting('parallel_processing', 'max_concurrent_devices', parseInt(val))}
          min={1}
          max={8}
          isDisabled={!settings.parallel_processing.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          How many USB drives can sync at the same time
        </Text>
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Max Concurrent Jobs (Total)</FormLabel>
        <NumberInput 
          value={settings.parallel_processing.max_concurrent_jobs}
          onChange={(val) => updateSetting('parallel_processing', 'max_concurrent_jobs', parseInt(val))}
          min={1}
          max={16}
          isDisabled={!settings.parallel_processing.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          Total jobs (sync/merge/stabilize) running simultaneously
        </Text>
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Priority Mode</FormLabel>
        <Select 
          value={settings.parallel_processing.priority_mode}
          onChange={(e) => updateSetting('parallel_processing', 'priority_mode', e.target.value)}
          isDisabled={!settings.parallel_processing.enabled}
          bg="whiteAlpha.300"
          borderColor="whiteAlpha.500"
          color="white"
        >
          <option value="fifo" style={{ background: '#1a202c' }}>First In First Out (FIFO)</option>
          <option value="size" style={{ background: '#1a202c' }}>Smallest Files First</option>
          <option value="device" style={{ background: '#1a202c' }}>Device Priority Order</option>
        </Select>
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Per-Device Bandwidth Limit (MB/s)</FormLabel>
        <NumberInput 
          value={settings.parallel_processing.per_device_bandwidth_limit_mbps}
          onChange={(val) => updateSetting('parallel_processing', 'per_device_bandwidth_limit_mbps', parseInt(val))}
          min={0}
          max={1000}
          isDisabled={!settings.parallel_processing.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          0 = unlimited, useful to prevent network saturation
        </Text>
      </FormControl>
    </VStack>
  );
}
