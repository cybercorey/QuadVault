import { SimpleGrid, Box } from '@chakra-ui/react'
import Layout from '../components/Layout'
import DevicesList from '../components/DevicesList'
import HistoryList from '../components/HistoryList'
import LiveLog from '../components/LiveLog'

export default function Home(){
  return (
    <Layout>
      <SimpleGrid columns={{base:1, lg:2}} spacing={6} mb={6}>
        <Box><DevicesList /></Box>
        <Box>
          <Box mt={2}><LiveLog /></Box>
        </Box>
      </SimpleGrid>
      <Box><HistoryList /></Box>
    </Layout>
  )
}
