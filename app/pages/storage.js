import Layout from '../components/Layout'
import StorageInfo from '../components/StorageInfo'
import LiveLog from '../components/LiveLog'
import { VStack } from '@chakra-ui/react'

export default function StoragePage(){
  return (
    <Layout>
      <VStack align="stretch" spacing={6}>
        <StorageInfo />
        <LiveLog />
      </VStack>
    </Layout>
  )
}
