import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, Box, Text, VStack, HStack, Badge } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

const GRID_SIZE = 20
const CELL_SIZE = 20
const INITIAL_SNAKE = [{ x: 10, y: 10 }]
const INITIAL_DIRECTION = { x: 1, y: 0 }

export default function SnakeGame({ isOpen, onClose }) {
  const canvasRef = useRef(null)
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [direction, setDirection] = useState(INITIAL_DIRECTION)
  const [food, setFood] = useState({ x: 15, y: 15 })
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [speed, setSpeed] = useState(200)
  const gameLoopRef = useRef(null)
  const directionRef = useRef(INITIAL_DIRECTION)
  const snakeRef = useRef(INITIAL_SNAKE)
  const foodRef = useRef({ x: 15, y: 15 })
  const scoreRef = useRef(0)
  const speedRef = useRef(200)

  // Generate random food position
  const generateFood = () => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    }
    return newFood
  }

  // Reset game
  const resetGame = () => {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    directionRef.current = INITIAL_DIRECTION
    snakeRef.current = INITIAL_SNAKE
    const newFood = generateFood()
    setFood(newFood)
    foodRef.current = newFood
    setGameOver(false)
    setScore(0)
    scoreRef.current = 0
    setSpeed(200)
    speedRef.current = 200
  }

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return
      
      const key = e.key
      const currentDir = directionRef.current

      if (key === 'ArrowUp' && currentDir.y === 0) {
        e.preventDefault()
        directionRef.current = { x: 0, y: -1 }
        setDirection({ x: 0, y: -1 })
      } else if (key === 'ArrowDown' && currentDir.y === 0) {
        e.preventDefault()
        directionRef.current = { x: 0, y: 1 }
        setDirection({ x: 0, y: 1 })
      } else if (key === 'ArrowLeft' && currentDir.x === 0) {
        e.preventDefault()
        directionRef.current = { x: -1, y: 0 }
        setDirection({ x: -1, y: 0 })
      } else if (key === 'ArrowRight' && currentDir.x === 0) {
        e.preventDefault()
        directionRef.current = { x: 1, y: 0 }
        setDirection({ x: 1, y: 0 })
      } else if (key === 'r' || key === 'R') {
        e.preventDefault()
        resetGame()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen])

  // Game loop
  useEffect(() => {
    if (!isOpen || gameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
      return
    }

    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
    }

    const runGame = () => {
      const currentSnake = snakeRef.current
      const currentDir = directionRef.current
      const currentFood = foodRef.current
      
      const head = currentSnake[0]
      const newHead = {
        x: (head.x + currentDir.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + currentDir.y + GRID_SIZE) % GRID_SIZE
      }

      // Check self collision
      if (currentSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true)
        clearInterval(gameLoopRef.current)
        return
      }

      const newSnake = [newHead, ...currentSnake]

      // Check food collision
      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        const newFood = generateFood()
        setFood(newFood)
        foodRef.current = newFood
        scoreRef.current += 10
        setScore(scoreRef.current)
        speedRef.current = Math.max(80, speedRef.current - 3)
        setSpeed(speedRef.current)
        snakeRef.current = newSnake
        setSnake(newSnake)
        
        // Restart interval with new speed
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = setInterval(runGame, speedRef.current)
      } else {
        newSnake.pop()
        snakeRef.current = newSnake
        setSnake(newSnake)
      }
    }

    gameLoopRef.current = setInterval(runGame, speedRef.current)

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [isOpen, gameOver])

  // Render game
  useEffect(() => {
    if (typeof window === 'undefined') return; // Safety check for SSR
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE)

    // Draw snake with gradient
    snake.forEach((segment, i) => {
      const gradient = ctx.createLinearGradient(
        segment.x * CELL_SIZE, 
        segment.y * CELL_SIZE, 
        segment.x * CELL_SIZE + CELL_SIZE, 
        segment.y * CELL_SIZE + CELL_SIZE
      )
      const alpha = 1 - (i / snake.length) * 0.5
      gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha})`)
      gradient.addColorStop(1, `rgba(124, 58, 237, ${alpha})`)
      
      ctx.fillStyle = gradient
      ctx.fillRect(
        segment.x * CELL_SIZE + 1, 
        segment.y * CELL_SIZE + 1, 
        CELL_SIZE - 2, 
        CELL_SIZE - 2
      )
    })

    // Draw food
    const foodGradient = ctx.createRadialGradient(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      0,
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2
    )
    foodGradient.addColorStop(0, '#f43f5e')
    foodGradient.addColorStop(1, '#be123c')
    ctx.fillStyle = foodGradient
    ctx.beginPath()
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }, [snake, food])

  const handleClose = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
    }
    resetGame()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
      <ModalContent bg="brand.panel" border="2px solid" borderColor="purple.500">
        <ModalHeader>
          <HStack justify="space-between">
            <Text>🐍 Snake Game</Text>
            <Badge bgGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" color="white" fontSize="lg" px={3} py={1}>
              Score: {score}
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <Box 
              border="2px solid" 
              borderColor="purple.500" 
              borderRadius="md" 
              overflow="hidden"
              boxShadow="0 0 20px rgba(139, 92, 246, 0.5)"
            >
              <canvas
                ref={canvasRef}
                width={GRID_SIZE * CELL_SIZE}
                height={GRID_SIZE * CELL_SIZE}
                style={{ display: 'block' }}
              />
            </Box>
            
            {gameOver && (
              <Box 
                bg="red.500" 
                color="white" 
                px={6} 
                py={3} 
                borderRadius="md" 
                fontWeight="bold"
                textAlign="center"
              >
                Game Over! Final Score: {score}
                <br />
                <Text fontSize="sm" mt={2}>Press R to restart</Text>
              </Box>
            )}
            
            <VStack spacing={2} color="whiteAlpha.700" fontSize="sm">
              <Text>🎮 Use Arrow Keys to control the snake</Text>
              <Text>🍎 Eat the red food to grow and score points</Text>
              <Text>⚡ Game speeds up as you score</Text>
              <Text>🔄 Press R to restart</Text>
            </VStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
