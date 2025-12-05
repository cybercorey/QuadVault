import Layout from '../components/Layout'
import StorageInfo from '../components/StorageInfo'
import StorageAnalytics from '../components/StorageAnalytics'
import LiveLog from '../components/LiveLog'
import { VStack, Tabs, TabList, TabPanels, Tab, TabPanel, HStack, Spacer } from '@chakra-ui/react'

export default function StoragePage(){
  return (
    <Layout>
      <Tabs colorScheme="purple" variant="enclosed">
        <HStack mb={4} align="flex-end">
          <TabList borderColor="whiteAlpha.300" flex="1">
            <Tab 
              color="whiteAlpha.700" 
              _selected={{ 
                color: 'white', 
                bg: 'whiteAlpha.200', 
                borderColor: 'whiteAlpha.400',
                borderBottomColor: 'transparent'
              }}
            >
              Storage Info
            </Tab>
            <Tab 
              color="whiteAlpha.700"
              _selected={{ 
                color: 'white', 
                bg: 'whiteAlpha.200', 
                borderColor: 'whiteAlpha.400',
                borderBottomColor: 'transparent'
              }}
            >
              Analytics & Reports
            </Tab>
            <Tab 
              color="whiteAlpha.700"
              _selected={{ 
                color: 'white', 
                bg: 'whiteAlpha.200', 
                borderColor: 'whiteAlpha.400',
                borderBottomColor: 'transparent'
              }}
            >
              Live Logs
            </Tab>
          </TabList>
          <Spacer />
          <StorageInfo compact />
        </HStack>

        <TabPanels>
          <TabPanel>
            <StorageInfo />
          </TabPanel>
          
          <TabPanel>
            <StorageAnalytics />
          </TabPanel>
          
          <TabPanel>
            <LiveLog />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layout>
  )
}
