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
  HStack
} from '@chakra-ui/react';

export default function FlightPath3DSettings({ settings, updateSetting }) {
  return (
    <VStack align="stretch" spacing={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="md" color="whiteAlpha.900">3D Flight Path Visualization</Heading>
        <Badge colorScheme={settings.flight_path_3d.enabled ? 'green' : 'gray'} fontSize="md" px={3} py={1}>
          {settings.flight_path_3d.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </HStack>
      
      <Text fontSize="sm" color="whiteAlpha.700" mb={2}>
        Parse GPS telemetry and render 3D flight paths on interactive maps.
      </Text>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Enable Flight Path Visualization</FormLabel>
        <Switch 
          isChecked={settings.flight_path_3d.enabled}
          onChange={(e) => updateSetting('flight_path_3d', 'enabled', e.target.checked)}
          colorScheme="purple"
          size="lg"
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Parse Telemetry Data</FormLabel>
        <Switch 
          isChecked={settings.flight_path_3d.parse_telemetry}
          onChange={(e) => updateSetting('flight_path_3d', 'parse_telemetry', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.flight_path_3d.enabled}
        />
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Map Provider</FormLabel>
        <Select 
          value={settings.flight_path_3d.map_provider}
          onChange={(e) => updateSetting('flight_path_3d', 'map_provider', e.target.value)}
          isDisabled={!settings.flight_path_3d.enabled}
          bg="whiteAlpha.300"
          borderColor="whiteAlpha.500"
          color="white"
        >
          <option value="mapbox" style={{ background: '#1a202c' }}>Mapbox GL (Recommended)</option>
          <option value="cesium" style={{ background: '#1a202c' }}>Cesium (Full 3D)</option>
          <option value="leaflet" style={{ background: '#1a202c' }}>Leaflet (2D, Free)</option>
        </Select>
      </FormControl>

      {settings.flight_path_3d.map_provider === 'mapbox' && (
        <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
          <FormLabel color="whiteAlpha.900" fontWeight="600">Mapbox Access Token</FormLabel>
          <Input 
            type="password"
            placeholder="pk.eyJ..."
            value={settings.flight_path_3d.mapbox_token}
            onChange={(e) => updateSetting('flight_path_3d', 'mapbox_token', e.target.value)}
            isDisabled={!settings.flight_path_3d.enabled}
            bg="whiteAlpha.300"
            borderColor="whiteAlpha.500"
            color="white"
            _placeholder={{ color: 'whiteAlpha.500' }}
          />
          <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
            Get free token at mapbox.com
          </Text>
        </FormControl>
      )}

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Default Altitude (meters)</FormLabel>
        <NumberInput 
          value={settings.flight_path_3d.default_altitude_meters}
          onChange={(val) => updateSetting('flight_path_3d', 'default_altitude_meters', parseInt(val))}
          min={0}
          max={500}
          isDisabled={!settings.flight_path_3d.enabled}
        >
          <NumberInputField bg="whiteAlpha.300" borderColor="whiteAlpha.500" color="white" />
          <NumberInputStepper>
            <NumberIncrementStepper color="whiteAlpha.900" />
            <NumberDecrementStepper color="whiteAlpha.900" />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="whiteAlpha.600" mt={2}>
          Used when telemetry has no altitude data
        </Text>
      </FormControl>

      <FormControl bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel color="whiteAlpha.900" fontWeight="600">Path Color</FormLabel>
        <Input 
          type="color"
          value={settings.flight_path_3d.path_color}
          onChange={(e) => updateSetting('flight_path_3d', 'path_color', e.target.value)}
          isDisabled={!settings.flight_path_3d.enabled}
          bg="whiteAlpha.300"
          borderColor="whiteAlpha.500"
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Show Waypoints</FormLabel>
        <Switch 
          isChecked={settings.flight_path_3d.show_waypoints}
          onChange={(e) => updateSetting('flight_path_3d', 'show_waypoints', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.flight_path_3d.enabled}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Show Altitude Graph</FormLabel>
        <Switch 
          isChecked={settings.flight_path_3d.show_altitude_graph}
          onChange={(e) => updateSetting('flight_path_3d', 'show_altitude_graph', e.target.checked)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.flight_path_3d.enabled}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" bg="whiteAlpha.200" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.400">
        <FormLabel mb={0} color="whiteAlpha.900" fontWeight="600">Export KML Files</FormLabel>
        <Switch 
          isChecked={settings.flight_path_3d.export_kml}
          onChange={(e) => updateSetting('flight_path_3d', 'export_kml', e.target.value)}
          colorScheme="purple"
          size="lg"
          isDisabled={!settings.flight_path_3d.enabled}
        />
      </FormControl>
      <Text fontSize="xs" color="whiteAlpha.600" mt={-4} ml={4}>
        Save flight paths as KML for Google Earth
      </Text>
    </VStack>
  );
}
