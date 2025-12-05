import { ChakraProvider, Container, Box } from '@chakra-ui/react'
import theme from '../lib/chakraTheme'
import Head from 'next/head'
import { useEffect } from 'react'

function GalaxyBackground() {
  useEffect(() => {
    if (typeof window === 'undefined') return; // Safety check for SSR
    
    const bg = document.getElementById('galaxy-bg')
    if (!bg) return

    // Load theme gradient from API and apply to background
    fetch('/api/theme')
      .then(r => r.json())
      .then(data => {
        if (data.primary_gradient) {
          // Set CSS variable for button gradients
          document.documentElement.style.setProperty('--theme-gradient', data.primary_gradient)
          
          // Extract colors from gradient for background overlays
          const gradientMatch = data.primary_gradient.match(/#[0-9a-f]{6}/gi)
          if (gradientMatch && gradientMatch.length >= 2) {
            const color1 = gradientMatch[0]
            const color2 = gradientMatch[1]
            
            const topOverlay = bg.querySelector('div:first-child')
            const bottomOverlay = bg.querySelector('div:last-child')
            
            if (topOverlay) {
              topOverlay.style.background = `radial-gradient(ellipse at top, ${color1}40 0%, transparent 50%)`
            }
            if (bottomOverlay) {
              bottomOverlay.style.background = `radial-gradient(ellipse at bottom, ${color2}30 0%, transparent 50%)`
            }
          }
        } else {
          // Set default gradient if no theme saved
          document.documentElement.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
        }
      })
      .catch(() => {
        // Set default gradient on error
        document.documentElement.style.setProperty('--theme-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
      })

    // Create stars
    const starCount = 200
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      star.style.left = Math.random() * 100 + '%'
      star.style.top = Math.random() * 100 + '%'
      star.style.animationDelay = Math.random() * 3 + 's'
      star.style.opacity = Math.random() * 0.7 + 0.3
      
      // Random size for depth
      const size = Math.random() * 2 + 1
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      
      bg.appendChild(star)
    }

    // Add CSS animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      .star {
        animation: twinkle 3s infinite;
      }
    `
    document.head.appendChild(style)

    return () => {
      if (bg) bg.innerHTML = ''
      if (style.parentNode) style.parentNode.removeChild(style)
    }
  }, [])

  return (
    <Box id="galaxy-bg">
      {/* Gradient overlay for depth - colors updated dynamically */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgGradient="radial-gradient(ellipse at top, rgba(139, 92, 246, 0.08) 0%, transparent 50%)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        top="50%"
        left="0"
        right="0"
        bottom="0"
        bgGradient="radial-gradient(ellipse at bottom, rgba(124, 58, 237, 0.05) 0%, transparent 50%)"
        pointerEvents="none"
      />
    </Box>
  )
}

export default function App({ Component, pageProps }){
  return (
    <ChakraProvider theme={theme}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>QuadVault</title>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB/UlEQVRYR+2Xv2sTQRTHP7eJQ0KpUiIhQkIhKIoWsoW2NvY2NgYWJjY2FgYIhY2PhhYWFgY2JhY0NCIikpKm9Jf0H/skl3Zt5JmZ25jz5s7szO6cOXPm3HNf3HPOd873POd+8AqKioqaydctwKjgaP4DXwKOgEfBA2Yr7otXVarVYjH4SnwF/gS2At2itVqvVrtfrl4Br4OMoH0KfAFcDlwBlAG2mLq+vp6jiOQCvwAlgHXAV2i/19bW5hKq1SqVjsfjcbotVqtFp1OpxCNRgNRqNfr9frtZrNZnEwmEwmC+wAtoF7we4B+wHpgY2NjJCMEwDCMRCKRSASQUhRFUZIkEqlQq/X4/B5/Pp/P5/P5fC4XC7FYrEYDAYfD4fEolE2Gw2IwzDMAySJEmSJPF4vFqt9sFgMBgMhmEwm83m8/mEw2GwWCwWiqIISZKkWCxWq9W+Z8+eJRKJRCKRSCTy+/14PM4L3AIWAHcBW4BTWC6XKysrMZ/PcRwH7AIWAHcBV4C77vd7pdFo1Gg0AgH6/X6/X4zDMPgOSJJNJpPDbDbDbDYDCMT6/v6+jgAIpFIpFIJBKJjzAMgzAMw/8BY4CPgA/CysqKqqpUKpXgcrksJEny3W63a7VaPR6PRCAQwHq9blKpVNoF9gB3gWuAO+BxYLFYDAYDAYjFYjH8Tn8Bb4CVgHPAD+Cn0DewH+G83G43Q6nQwA7gZuB+4Pr169fT8bCwsKqqqqeA2+TyaT9kRERETkF/AAAH8Ab2XPWYwAAAABJRU5ErkJggg==" type="image/png" />
        {/* fonts are loaded from _document.js to avoid Next.js runtime warning */}
      </Head>
      <GalaxyBackground />
      <Container maxW="container.xl" p={4} position="relative" zIndex={1}>
        <Component {...pageProps} />
      </Container>
    </ChakraProvider>
  )
}
