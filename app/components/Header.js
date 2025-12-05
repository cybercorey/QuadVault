import { HStack, Image, Heading, Spacer, Button, Badge, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Box, Text, Textarea, VStack, Input, SimpleGrid, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import StorageInfo from './StorageInfo'
import { FiDroplet, FiHardDrive } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { purpleGradients } from '../lib/chakraTheme'
import SnakeGame from './SnakeGame'
// Importing package.json can sometimes cause SSR issues; inline version
const APP_VERSION = '1.4.0'

export default function Header(){
  const { isOpen: isConfigOpen, onOpen: onConfigOpen, onClose: onConfigClose } = useDisclosure()
  const { isOpen: isAccentOpen, onOpen: onAccentOpen, onClose: onAccentClose } = useDisclosure()
  const { isOpen: isSnakeOpen, onOpen: onSnakeOpen, onClose: onSnakeClose } = useDisclosure()
  const [selectedGradient, setSelectedGradient] = useState('cosmic1')
  const [rainbowMode, setRainbowMode] = useState(false)
  const clickTimeoutRef = useRef(null)
  const clickCountRef = useRef(0)
  const rainbowIntervalRef = useRef(null)

  // Convert gradient presets to array
  const gradientPresets = Object.entries(purpleGradients).map(([name, gradient]) => ({
    name,
    gradient
  }))

  useEffect(() => {
    // Load saved theme from API
    fetch('/api/theme')
      .then(r => r.json())
      .then(data => {
        if (data.primary_gradient) {
          const gradientKey = Object.keys(purpleGradients).find(
            key => purpleGradients[key] === data.primary_gradient
          )
          if (gradientKey) {
            setSelectedGradient(gradientKey)
            applyGradient(data.primary_gradient)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Rainbow mode effect
  useEffect(() => {
    if (rainbowMode) {
      const gradientKeys = Object.keys(purpleGradients)
      let index = 0
      
      rainbowIntervalRef.current = setInterval(() => {
        const randomKey = gradientKeys[index % gradientKeys.length]
        applyGradient(purpleGradients[randomKey])
        index++
      }, 200)
      
      return () => {
        if (rainbowIntervalRef.current) {
          clearInterval(rainbowIntervalRef.current)
        }
      }
    } else {
      if (rainbowIntervalRef.current) {
        clearInterval(rainbowIntervalRef.current)
      }
      applyGradient(purpleGradients[selectedGradient])
    }
  }, [rainbowMode, selectedGradient])

  const handleIconClick = () => {
    if (typeof window === 'undefined') return; // Safety check for SSR
    
    clickCountRef.current++
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
    
    if (clickCountRef.current === 2) {
      // Double click detected!
      setRainbowMode(true)
      onSnakeOpen()
      clickCountRef.current = 0
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0
      }, 300)
    }
  }

  const handleSnakeClose = () => {
    setRainbowMode(false)
    onSnakeClose()
  }

  function applyGradient(gradient){
    if (typeof window === 'undefined') return; // Safety check for SSR
    if (!gradient) return; // Safety check for undefined gradient
    
    // Apply gradient to background overlays
    const gradientTop = document.querySelector('#galaxy-bg > div:first-child')
    const gradientBottom = document.querySelector('#galaxy-bg > div:last-child')
    
    if (gradientTop) {
      gradientTop.style.background = `radial-gradient(ellipse at top, ${gradient.replace('linear-gradient(135deg,', '').replace(')', '').split(',')[0]} 0%, transparent 50%)`
    }
    if (gradientBottom) {
      gradientBottom.style.background = `radial-gradient(ellipse at bottom, ${gradient.replace('linear-gradient(135deg,', '').replace(')', '').split(',')[0]} 0%, transparent 50%)`
    }

    // Store gradient in CSS variable for button usage
    document.documentElement.style.setProperty('--theme-gradient', gradient)
  }

  async function saveTheme(){
    const gradient = purpleGradients[selectedGradient]
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
    })
    applyGradient(gradient)
    window.location.reload()
  }

  return (
    <>
      <HStack spacing={4} alignItems="center" mb={6} pb={3} borderBottom="1px solid" borderColor="whiteAlpha.100">
        <Heading as="h1" size="md">
          <Box 
            as={FiHardDrive} 
            display="inline" 
            mr={2} 
            cursor="pointer"
            onClick={handleIconClick}
            transition="all 0.2s"
            _hover={{ transform: 'scale(1.1)' }}
          />
          QuadVault
        </Heading>
        <Badge 
          bgGradient={purpleGradients[selectedGradient]}
          color="white"
          px={3}
          py={1}
          borderRadius="md"
          fontWeight="600"
        >
          v{APP_VERSION}
        </Badge>
        <Spacer />
        <Box mr={4}><StorageInfo compact /></Box>
        <Button size="sm" leftIcon={<FiDroplet />} onClick={onAccentOpen} variant="outline" colorScheme="purple">Theme</Button>
      </HStack>

      <SnakeGame isOpen={isSnakeOpen} onClose={handleSnakeClose} />

      <Modal isOpen={isAccentOpen} onClose={onAccentClose} size="4xl">
        <ModalOverlay />
        <ModalContent bg="brand.panel" maxH="90vh">
          <ModalHeader>Galaxy Theme Gradients</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            <VStack align="stretch" spacing={6}>
              <Box>
                <Text fontWeight="600" mb={4} fontSize="lg">Choose Your Galaxy Gradient</Text>
                <Text fontSize="sm" color="whiteAlpha.700" mb={4}>
                  Select a gradient to apply throughout the UI - buttons, badges, and background accents will all use this theme
                </Text>
                <SimpleGrid columns={5} spacing={3}>
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
                    {selectedGradient.toUpperCase()}
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
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button 
              bgGradient={purpleGradients[selectedGradient]} 
              color="white" 
              mr={3} 
              onClick={saveTheme}
              _hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.5)' }}
              size="lg"
            >
              Apply {selectedGradient} Theme
            </Button>
            <Button variant="ghost" onClick={onAccentClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
