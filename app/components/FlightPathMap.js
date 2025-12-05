import { useState, useEffect } from 'react';
import { Box, Text, Spinner, Alert, AlertIcon } from '@chakra-ui/react';

export default function FlightPathMap({ deviceUuid, folderName }) {
  const [flightPaths, setFlightPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadFlightPaths();
  }, [deviceUuid, folderName]);

  async function loadFlightPaths() {
    try {
      const res = await fetch(`/api/flight-paths?uuid=${deviceUuid}&folder=${folderName}`);
      const data = await res.json();
      
      setEnabled(data.enabled);
      if (data.flightPaths) {
        setFlightPaths(data.flightPaths);
      }
    } catch (err) {
      console.error('Failed to load flight paths:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box textAlign="center" py={4}>
        <Spinner size="sm" color="purple.400" />
        <Text fontSize="sm" color="whiteAlpha.600" mt={2}>
          Loading flight paths...
        </Text>
      </Box>
    );
  }

  if (!enabled) {
    return (
      <Alert status="info" bg="whiteAlpha.100" borderRadius="md" size="sm">
        <AlertIcon />
        <Text fontSize="sm">
          Flight path visualization is disabled. Enable in Settings → Advanced Features.
        </Text>
      </Alert>
    );
  }

  if (flightPaths.length === 0) {
    return (
      <Text fontSize="sm" color="whiteAlpha.600" textAlign="center" py={4}>
        No GPS telemetry data found for this folder
      </Text>
    );
  }

  // Simple SVG visualization (basic implementation)
  // In production, this would use Mapbox GL or Leaflet
  
  // Calculate bounds
  const allPoints = flightPaths.flatMap(fp => fp.points);
  const lons = allPoints.map(p => p[0]);
  const lats = allPoints.map(p => p[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  
  const width = 400;
  const height = 300;
  const padding = 20;
  
  // Scale points to SVG coordinates
  const scaleX = (lon) => ((lon - minLon) / (maxLon - minLon)) * (width - 2 * padding) + padding;
  const scaleY = (lat) => height - (((lat - minLat) / (maxLat - minLat)) * (height - 2 * padding) + padding);
  
  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <Box
      bg="whiteAlpha.100"
      borderRadius="md"
      p={4}
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <Text fontSize="sm" fontWeight="600" mb={2}>
        Flight Paths ({flightPaths.length} flight{flightPaths.length > 1 ? 's' : ''})
      </Text>
      
      <svg width={width} height={height} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
        {/* Grid lines */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth="1">
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={`h${i}`}
              x1={padding}
              y1={padding + (i * (height - 2 * padding) / 4)}
              x2={width - padding}
              y2={padding + (i * (height - 2 * padding) / 4)}
            />
          ))}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={`v${i}`}
              x1={padding + (i * (width - 2 * padding) / 4)}
              y1={padding}
              x2={padding + (i * (width - 2 * padding) / 4)}
              y2={height - padding}
            />
          ))}
        </g>
        
        {/* Flight paths */}
        {flightPaths.map((fp, idx) => {
          const pathData = fp.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p[0])} ${scaleY(p[1])}`)
            .join(' ');
          
          return (
            <g key={idx}>
              <path
                d={pathData}
                stroke={colors[idx % colors.length]}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Start point */}
              <circle
                cx={scaleX(fp.points[0][0])}
                cy={scaleY(fp.points[0][1])}
                r="4"
                fill="#10b981"
              />
              {/* End point */}
              <circle
                cx={scaleX(fp.points[fp.points.length - 1][0])}
                cy={scaleY(fp.points[fp.points.length - 1][1])}
                r="4"
                fill="#ef4444"
              />
            </g>
          );
        })}
      </svg>
      
      <Box mt={2}>
        {flightPaths.map((fp, idx) => (
          <Text key={idx} fontSize="xs" color="whiteAlpha.600">
            <Box as="span" display="inline-block" w="12px" h="12px" bg={colors[idx % colors.length]} borderRadius="sm" mr={2} />
            {fp.video} ({fp.points.length} GPS points)
          </Text>
        ))}
      </Box>
      
      <Text fontSize="xs" color="whiteAlpha.500" mt={2}>
        🟢 Start • 🔴 End
      </Text>
    </Box>
  );
}
