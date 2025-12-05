import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  SimpleGrid,
  Badge,
  useToast
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { purpleGradients } from '../lib/chakraTheme';

export default function AppearanceSettings() {
  const toast = useToast();
  const [selectedGradient, setSelectedGradient] = useState('cosmic1');
  const [saving, setSaving] = useState(false);

  // Convert gradient presets to array
  const gradientPresets = Object.entries(purpleGradients).map(([name, gradient]) => ({
    name,
    gradient
  }));

  useEffect(() => {
    // Load saved theme from API
    fetch('/api/theme')
      .then(r => r.json())
      .then(data => {
        if (data.primary_gradient) {
          const gradientKey = Object.keys(purpleGradients).find(
            key => purpleGradients[key] === data.primary_gradient
          );
          if (gradientKey) {
            setSelectedGradient(gradientKey);
          }
        }
      })
      .catch(() => {});
  }, []);

  function applyGradient(gradient) {
    if (typeof window === 'undefined') return;
    if (!gradient) return;
    
    // Apply gradient to background overlays
    const gradientTop = document.querySelector('#galaxy-bg > div:first-child');
    const gradientBottom = document.querySelector('#galaxy-bg > div:last-child');
    
    if (gradientTop) {
      gradientTop.style.background = `radial-gradient(ellipse at top, ${gradient.replace('linear-gradient(135deg,', '').replace(')', '').split(',')[0]} 0%, transparent 50%)`;
    }
    if (gradientBottom) {
      gradientBottom.style.background = `radial-gradient(ellipse at bottom, ${gradient.replace('linear-gradient(135deg,', '').replace(')', '').split(',')[0]} 0%, transparent 50%)`;
    }

    // Store gradient in CSS variable for button usage
    document.documentElement.style.setProperty('--theme-gradient', gradient);
  }

  async function saveTheme() {
    setSaving(true);
    const gradient = purpleGradients[selectedGradient];
    
    try {
      await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background_type: 'galaxy',
          primary_gradient: gradient,
          secondary_gradient: gradient,
          accent_color: '#8b5cf6',
          panel_opacity: 0.85
        })
      });
      
      applyGradient(gradient);
      
      toast({
        title: 'Theme Applied',
        description: `${selectedGradient} gradient has been saved`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save theme',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Text fontSize="2xl" fontWeight="600" mb={2}>Galaxy Theme Gradients</Text>
        <Text fontSize="sm" color="whiteAlpha.700" mb={6}>
          Select a gradient to apply throughout the UI - buttons, badges, and background accents will all use this theme
        </Text>

        <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={3} mb={6}>
          {gradientPresets.map(preset => (
            <Button
              key={preset.name}
              onClick={() => setSelectedGradient(preset.name)}
              bgGradient={preset.gradient}
              color="white"
              h="70px"
              _hover={{ transform: 'scale(1.05)', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.5)' }}
              border={selectedGradient === preset.name ? '3px solid white' : '2px solid'}
              borderColor={selectedGradient === preset.name ? 'white' : 'whiteAlpha.300'}
              transition="all 0.2s"
              flexDirection="column"
              fontSize="xs"
              fontWeight="bold"
              position="relative"
              overflow="hidden"
            >
              <Text textTransform="capitalize" textShadow="0 2px 4px rgba(0,0,0,0.5)">
                {preset.name}
              </Text>
              {selectedGradient === preset.name && (
                <Box
                  position="absolute"
                  top="2"
                  right="2"
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg="white"
                  boxShadow="0 0 8px white"
                />
              )}
            </Button>
          ))}
        </SimpleGrid>
      </Box>
      
      <Box 
        p={8} 
        borderRadius="xl" 
        bgGradient={purpleGradients[selectedGradient]}
        position="relative"
        overflow="hidden"
      >
        <Box position="relative" zIndex={1}>
          <Text color="white" fontWeight="700" fontSize="2xl" mb={2} textShadow="0 2px 8px rgba(0,0,0,0.3)">
            {selectedGradient.toUpperCase()} PREVIEW
          </Text>
          <Text color="whiteAlpha.900" fontSize="md" mb={4} textShadow="0 1px 4px rgba(0,0,0,0.3)">
            This gradient will transform your entire interface
          </Text>
          <HStack spacing={3}>
            <Button size="sm" bg="whiteAlpha.300" backdropFilter="blur(10px)" color="white" _hover={{ bg: 'whiteAlpha.400' }}>
              Sample Button
            </Button>
            <Badge bgGradient={purpleGradients[selectedGradient]} color="white" px={3} py={1} fontSize="sm">
              Sample Badge
            </Badge>
          </HStack>
        </Box>
        <Box
          position="absolute"
          top="-50%"
          right="-10%"
          w="300px"
          h="300px"
          borderRadius="full"
          bg="whiteAlpha.200"
          filter="blur(60px)"
          zIndex={0}
        />
      </Box>

      <Box pt={4}>
        <Button 
          bgGradient={purpleGradients[selectedGradient]} 
          color="white" 
          onClick={saveTheme}
          isLoading={saving}
          loadingText="Applying..."
          _hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.5)' }}
          size="lg"
        >
          Apply {selectedGradient} Theme
        </Button>
      </Box>
    </VStack>
  );
}
