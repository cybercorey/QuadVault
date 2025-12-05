import { HStack, Heading, Spacer, Button, Badge, Box, useDisclosure } from '@chakra-ui/react'
import { FiHardDrive, FiHome, FiClock, FiDatabase, FiSettings, FiCpu } from 'react-icons/fi'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { purpleGradients } from '../lib/chakraTheme'
import SnakeGame from './SnakeGame'
// Importing package.json can sometimes cause SSR issues; inline version
const APP_VERSION = '1.4.0'

export default function Header(){
  const router = useRouter()
  const { isOpen: isSnakeOpen, onOpen: onSnakeOpen, onClose: onSnakeClose } = useDisclosure()
  const [selectedGradient, setSelectedGradient] = useState('cosmic1')
  const [rainbowMode, setRainbowMode] = useState(false)
  const clickTimeoutRef = useRef(null)
  const clickCountRef = useRef(0)
  const rainbowIntervalRef = useRef(null)

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
        
        {/* Navigation Links */}
        <HStack spacing={2}>
          <Button 
            size="sm" 
            leftIcon={<FiHome />} 
            onClick={() => router.push('/')}
            variant={router.pathname === '/' ? 'solid' : 'ghost'}
            bgGradient={router.pathname === '/' ? purpleGradients[selectedGradient] : undefined}
            color={router.pathname === '/' ? 'white' : 'whiteAlpha.700'}
            _hover={router.pathname === '/' ? { opacity: 0.9 } : { bg: 'whiteAlpha.100', color: 'white' }}
          >
            Dashboard
          </Button>
          <Button 
            size="sm" 
            leftIcon={<FiClock />} 
            onClick={() => router.push('/history')}
            variant={router.pathname === '/history' ? 'solid' : 'ghost'}
            bgGradient={router.pathname === '/history' ? purpleGradients[selectedGradient] : undefined}
            color={router.pathname === '/history' ? 'white' : 'whiteAlpha.700'}
            _hover={router.pathname === '/history' ? { opacity: 0.9 } : { bg: 'whiteAlpha.100', color: 'white' }}
          >
            History
          </Button>
          <Button 
            size="sm" 
            leftIcon={<FiDatabase />} 
            onClick={() => router.push('/storage')}
            variant={router.pathname === '/storage' ? 'solid' : 'ghost'}
            bgGradient={router.pathname === '/storage' ? purpleGradients[selectedGradient] : undefined}
            color={router.pathname === '/storage' ? 'white' : 'whiteAlpha.700'}
            _hover={router.pathname === '/storage' ? { opacity: 0.9 } : { bg: 'whiteAlpha.100', color: 'white' }}
            position="relative"
          >
            Storage
            <Badge 
              position="absolute" 
              top="-2" 
              right="-2" 
              fontSize="8px" 
              colorScheme="purple"
              borderRadius="full"
              px={1.5}
              py={0.5}
            >
              ✨
            </Badge>
          </Button>
          <Button 
            size="sm" 
            leftIcon={<FiCpu />} 
            onClick={() => router.push('/ai-training')}
            variant={router.pathname === '/ai-training' ? 'solid' : 'ghost'}
            bgGradient={router.pathname === '/ai-training' ? purpleGradients[selectedGradient] : undefined}
            color={router.pathname === '/ai-training' ? 'white' : 'whiteAlpha.700'}
            _hover={router.pathname === '/ai-training' ? { opacity: 0.9 } : { bg: 'whiteAlpha.100', color: 'white' }}
            position="relative"
          >
            AI Training
            <Badge 
              position="absolute" 
              top="-2" 
              right="-2" 
              fontSize="8px" 
              colorScheme="cyan"
              borderRadius="full"
              px={1.5}
              py={0.5}
            >
              🤖
            </Badge>
          </Button>
          <Button 
            size="sm" 
            leftIcon={<FiSettings />} 
            onClick={() => router.push('/settings')}
            variant={router.pathname === '/settings' ? 'solid' : 'ghost'}
            bgGradient={router.pathname === '/settings' ? purpleGradients[selectedGradient] : undefined}
            color={router.pathname === '/settings' ? 'white' : 'whiteAlpha.700'}
            _hover={router.pathname === '/settings' ? { opacity: 0.9 } : { bg: 'whiteAlpha.100', color: 'white' }}
            position="relative"
          >
            Settings
            <Badge 
              position="absolute" 
              top="-2" 
              right="-2" 
              fontSize="8px" 
              colorScheme="green"
              borderRadius="full"
              px={1.5}
              py={0.5}
            >
              NEW
            </Badge>
          </Button>
        </HStack>
      </HStack>

      <SnakeGame isOpen={isSnakeOpen} onClose={handleSnakeClose} />
    </>
  )
}
