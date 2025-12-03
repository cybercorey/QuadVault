import { extendTheme } from '@chakra-ui/react'

// 30 Dark Purple gradient presets for space/galaxy theme
const purpleGradients = {
  'Deep Void': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'Twilight Nebula': 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
  'Purple Haze': 'linear-gradient(135deg, #c471f5 0%, #764ba2 100%)',
  'Midnight Bloom': 'linear-gradient(135deg, #2e1437 0%, #8b3a8b 100%)',
  'Dark Matter': 'linear-gradient(135deg, #300042 0%, #6a0572 100%)',
  'Cosmic Dusk': 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)',
  'Shadow Realm': 'linear-gradient(135deg, #1a0033 0%, #5b247a 100%)',
  'Violet Storm': 'linear-gradient(135deg, #6a00f4 0%, #4a148c 100%)',
  'Amethyst Dream': 'linear-gradient(135deg, #9b59b6 0%, #3a1c71 100%)',
  'Plum Twilight': 'linear-gradient(135deg, #360033 0%, #0b8793 100%)',
  'Lavender Mist': 'linear-gradient(135deg, #8e44ad 0%, #512e5f 100%)',
  'Indigo Night': 'linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%)',
  'Orchid Shadows': 'linear-gradient(135deg, #7303c0 0%, #3b2667 100%)',
  'Mystic Purple': 'linear-gradient(135deg, #aa00ff 0%, #4a148c 100%)',
  'Galactic Core': 'linear-gradient(135deg, #5f2c82 0%, #aa076b 100%)',
  'Purple Infinity': 'linear-gradient(135deg, #6a3093 0%, #a044ff 100%)',
  'Velvet Dusk': 'linear-gradient(135deg, #4e0066 0%, #8b2a8b 100%)',
  'Mauve Eclipse': 'linear-gradient(135deg, #9d50bb 0%, #6e48aa 100%)',
  'Iris Depths': 'linear-gradient(135deg, #5a3f37 0%, #2c7744 100%)',
  'Aubergine Sky': 'linear-gradient(135deg, #aa076b 0%, #61045f 100%)',
  'Plum Odyssey': 'linear-gradient(135deg, #642b73 0%, #c6426e 100%)',
  'Royal Amethyst': 'linear-gradient(135deg, #7f00ff 0%, #5b247a 100%)',
  'Starlight Violet': 'linear-gradient(135deg, #5f72bd 0%, #9b23ea 100%)',
  'Purple Cosmos': 'linear-gradient(135deg, #330867 0%, #30cfd0 100%)',
  'Nightshade': 'linear-gradient(135deg, #2e1437 0%, #4a148c 100%)',
  'Lavender Storm': 'linear-gradient(135deg, #bc4e9c 0%, #f80759 100%)',
  'Dark Orchid': 'linear-gradient(135deg, #7303c0 0%, #ec38bc 100%)',
  'Eggplant Noir': 'linear-gradient(135deg, #360033 0%, #0b8793 100%)',
  'Purple Haze Deluxe': 'linear-gradient(135deg, #9b59b6 0%, #e74c3c 100%)',
  'Ultra Violet': 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)',
}

// Extended purple color palette (30 shades)
const purpleScale = {
  50: '#faf5ff',
  100: '#f3e8ff',
  150: '#ede0ff',
  200: '#e9d5ff',
  250: '#e0c5ff',
  300: '#d8b4fe',
  350: '#d0a5fe',
  400: '#c084fc',
  450: '#b375f7',
  500: '#a855f7',
  550: '#9d45f2',
  600: '#9333ea',
  650: '#8828e0',
  700: '#7e22ce',
  750: '#741fc4',
  800: '#6b21a8',
  850: '#621e96',
  900: '#581c87',
  950: '#3b0764',
  cosmic: '#8b5cf6',
  nebula: '#a78bfa',
  galaxy: '#7c3aed',
  stardust: '#9333ea',
  void: '#6d28d9',
  aurora: '#8b5cf6',
  supernova: '#c084fc',
  pulsar: '#a855f7',
  quasar: '#7e22ce',
  blackhole: '#581c87',
}

const colors = {
  bg: '#0a0a0f',
  panel: 'rgba(18, 18, 28, 0.85)',
  muted: '#9ca3af',
  text: '#f0f0f5',
  accent: purpleScale.cosmic,
  'accent-600': purpleScale[600],
  'accent-700': purpleScale[700],
  'accent-500': purpleScale[500],
}

const theme = extendTheme({
  fonts: {
    heading: `'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
    body: `'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
  },
  styles: {
    global: {
      '@import': "url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap')",
      body: {
        bg: colors.bg,
        color: colors.text,
        position: 'relative',
        minHeight: '100vh',
      },
      '#galaxy-bg': {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
        overflow: 'hidden',
      },
      '.star': {
        position: 'absolute',
        width: '2px',
        height: '2px',
        background: 'white',
        borderRadius: '50%',
        boxShadow: '0 0 3px rgba(255,255,255,0.3)',
      },
      '::placeholder': { color: colors.muted },
    },
  },
  colors: {
    brand: colors,
    purple: purpleScale,
    purpleGradients,
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: '8px',
        fontWeight: '600',
      },
      defaultProps: {
        variant: 'solid',
      },
      variants: {
        accent: () => ({
          background: 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))',
          color: 'white',
          border: 'none',
          _hover: { 
            opacity: 0.9,
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          },
          _active: {
            opacity: 0.8,
          },
          transition: 'all 0.2s',
        }),
        outline: (props) => ({
          borderColor: 'whiteAlpha.400',
          color: 'white',
          bg: 'whiteAlpha.100',
          backdropFilter: 'blur(10px)',
          borderWidth: '2px',
          _hover: {
            bg: 'whiteAlpha.200',
            borderColor: 'whiteAlpha.600',
            transform: 'translateY(-1px)',
          },
          _active: {
            bg: 'whiteAlpha.250',
          },
          transition: 'all 0.2s',
        }),
        solid: (props) => ({
          background: 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))',
          color: 'white',
          border: 'none',
          _hover: {
            opacity: 0.9,
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          },
          _active: {
            opacity: 0.8,
          },
          _disabled: {
            opacity: 0.4,
            cursor: 'not-allowed',
            _hover: {
              opacity: 0.4,
              transform: 'none',
            },
          },
          transition: 'all 0.2s',
        }),
        ghost: () => ({
          bg: 'transparent',
          color: 'white',
          _hover: {
            bg: 'whiteAlpha.200',
          },
          _active: {
            bg: 'whiteAlpha.300',
          },
        }),
      },
    },
    IconButton: {
      baseStyle: {
        borderRadius: '8px',
      },
      variants: {
        outline: () => ({
          borderColor: 'whiteAlpha.400',
          color: 'white',
          bg: 'whiteAlpha.100',
          borderWidth: '2px',
          _hover: {
            bg: 'whiteAlpha.200',
            borderColor: 'whiteAlpha.600',
          },
        }),
        ghost: () => ({
          bg: 'transparent',
          color: 'white',
          _hover: {
            bg: 'whiteAlpha.200',
          },
        }),
        solid: () => ({
          background: 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))',
          color: 'white',
          _hover: {
            opacity: 0.9,
          },
        }),
      },
    },
    Box: {
      baseStyle: {
        backdropFilter: 'blur(10px)',
      },
    },
  },
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
})

export default theme
export { purpleGradients, purpleScale }
