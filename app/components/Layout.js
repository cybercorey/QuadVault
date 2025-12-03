import { Box, Text } from '@chakra-ui/react'
import Header from './Header'
import LiveJobBanner from './LiveJobBanner'

export default function Layout({ children }){
  return (
    <Box className="app-root" minH="100vh" overflowX="hidden">
      <Box px={4} pt={4}>
        <Header />
        <LiveJobBanner />
      </Box>
      <Box as="main" px={4} pb={8}>{children}</Box>
    </Box>
  )
}
