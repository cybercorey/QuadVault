import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast
} from '@chakra-ui/react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6'];

export default function StorageAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const res = await fetch('/api/storage-analytics');
      const data = await res.json();
      
      if (data.success) {
        setAnalytics(data.current);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function computeNow() {
    setComputing(true);
    try {
      const res = await fetch('/api/storage-analytics?action=compute');
      const data = await res.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
        toast({
          title: 'Analytics computed',
          description: `Scanned ${data.analytics.totalFiles.toLocaleString()} files`,
          status: 'success',
          duration: 3000
        });
        await loadAnalytics(); // Reload to get history
      } else {
        throw new Error(data.error || 'Computation failed');
      }
    } catch (err) {
      toast({
        title: 'Failed to compute analytics',
        description: err.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setComputing(false);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="purple.400" />
        <Text mt={4} color="whiteAlpha.600">Loading analytics...</Text>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box>
        <Alert status="info" bg="whiteAlpha.100" borderRadius="md">
          <AlertIcon />
          <Text>No analytics data available. Click "Compute Now" to generate reports.</Text>
        </Alert>
        <Button
          mt={4}
          onClick={computeNow}
          isLoading={computing}
          background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
          color="white"
          _hover={{ opacity: 0.9 }}
        >
          Compute Analytics Now
        </Button>
      </Box>
    );
  }

  // Prepare chart data
  const deviceData = Object.entries(analytics.byDevice || {}).map(([name, data]) => ({
    name,
    size: data.size,
    files: data.count,
    sizeGB: (data.size / (1024 ** 3)).toFixed(2)
  }));

  const typeData = Object.entries(analytics.byType || {})
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10)
    .map(([ext, data]) => ({
      name: ext || 'no extension',
      size: data.size,
      files: data.count,
      sizeGB: (data.size / (1024 ** 3)).toFixed(2)
    }));

  const historyData = history.slice(-30).map(entry => ({
    date: new Date(entry.timestamp).toLocaleDateString(),
    sizeGB: (entry.totalSize / (1024 ** 3)).toFixed(2),
    files: entry.totalFiles
  }));

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header with Refresh Button */}
      <HStack justify="space-between">
        <Box>
          <Heading size="md">Storage Analytics</Heading>
          <Text fontSize="sm" color="whiteAlpha.600" mt={1}>
            Last updated: {formatDate(analytics.timestamp)}
          </Text>
        </Box>
        <Button
          onClick={computeNow}
          isLoading={computing}
          size="sm"
          colorScheme="purple"
          variant="outline"
        >
          Refresh Analytics
        </Button>
      </HStack>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <Stat
          bg="whiteAlpha.100"
          p={4}
          borderRadius="md"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel>Total Storage</StatLabel>
          <StatNumber>{formatBytes(analytics.totalSize)}</StatNumber>
          <StatHelpText>
            {((analytics.totalSize / (1024 ** 3)) || 0).toFixed(2)} GB
          </StatHelpText>
        </Stat>

        <Stat
          bg="whiteAlpha.100"
          p={4}
          borderRadius="md"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel>Total Files</StatLabel>
          <StatNumber>{analytics.totalFiles.toLocaleString()}</StatNumber>
          <StatHelpText>
            {Object.keys(analytics.byDevice || {}).length} devices
          </StatHelpText>
        </Stat>

        <Stat
          bg="whiteAlpha.100"
          p={4}
          borderRadius="md"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel>Duplicates Found</StatLabel>
          <StatNumber>{(analytics.duplicates || []).length}</StatNumber>
          <StatHelpText>
            {formatBytes(analytics.potentialSavings || 0)} wasted
          </StatHelpText>
        </Stat>

        <Stat
          bg="whiteAlpha.100"
          p={4}
          borderRadius="md"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel>Avg File Size</StatLabel>
          <StatNumber>
            {formatBytes(analytics.totalFiles > 0 ? analytics.totalSize / analytics.totalFiles : 0)}
          </StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Storage Trend Chart */}
      {historyData.length > 1 && (
        <Box
          bg="whiteAlpha.100"
          p={6}
          borderRadius="md"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Heading size="sm" mb={4}>Storage Trend (Last 30 Days)</Heading>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sizeGB" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Storage (GB)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Device Usage Chart */}
      {deviceData.length > 0 && (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Box
            bg="whiteAlpha.100"
            p={6}
            borderRadius="md"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Heading size="sm" mb={4}>Storage by Device</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="sizeGB" fill="#8b5cf6" name="Storage (GB)" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Box
            bg="whiteAlpha.100"
            p={6}
            borderRadius="md"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Heading size="sm" mb={4}>Storage by File Type</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sizeGB"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </SimpleGrid>
      )}

      {/* Duplicates Table */}
      {analytics.duplicates && analytics.duplicates.length > 0 && (
        <Box
          bg="whiteAlpha.100"
          p={6}
          borderRadius="md"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Heading size="sm" mb={4}>Duplicate Files (Potential Savings)</Heading>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th color="whiteAlpha.700">File Size</Th>
                  <Th color="whiteAlpha.700">Copies</Th>
                  <Th color="whiteAlpha.700">Wasted Space</Th>
                  <Th color="whiteAlpha.700">Locations</Th>
                </Tr>
              </Thead>
              <Tbody>
                {analytics.duplicates.slice(0, 20).map((dup, idx) => (
                  <Tr key={idx}>
                    <Td>{formatBytes(dup.size)}</Td>
                    <Td>
                      <Badge colorScheme="orange">{dup.count}</Badge>
                    </Td>
                    <Td color="red.300">{formatBytes(dup.potentialSavings)}</Td>
                    <Td fontSize="xs" color="whiteAlpha.600">
                      {dup.files.slice(0, 2).map(f => f.split('/').pop()).join(', ')}
                      {dup.files.length > 2 && ` + ${dup.files.length - 2} more`}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          {analytics.duplicates.length > 20 && (
            <Text fontSize="sm" color="whiteAlpha.500" mt={2}>
              Showing 20 of {analytics.duplicates.length} duplicate groups
            </Text>
          )}
        </Box>
      )}
    </VStack>
  );
}
