import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import AppearanceSettings from '../components/AppearanceSettings'
import ParallelProcessing from '../components/settings/ParallelProcessing'
import StorageAnalytics from '../components/settings/StorageAnalytics'
import IncrementalSync from '../components/settings/IncrementalSync'
import AISettings from '../components/settings/AISettings'
import FlightPath3D from '../components/settings/FlightPath3D'
import { 
  Heading, 
  Textarea, 
  Button, 
  VStack, 
  HStack, 
  Text, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Divider,
  useToast 
} from '@chakra-ui/react'

export default function Settings(){
  const toast = useToast()
  const [configText, setConfigText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [advancedSettings, setAdvancedSettings] = useState({
    parallel_processing: {
      enabled: false,
      max_concurrent_devices: 2,
      max_concurrent_jobs: 4,
      priority_mode: 'fifo',
  async function save(){
    setSaving(true)
    setMessage(null)
    try{
      const body = JSON.parse(configText)
      const r = await fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const json = await r.json()
      if (json && json.success) setMessage({type:'success', text:'Saved'});
      else setMessage({type:'error', text:'Save failed'})
    }catch(e){
      setMessage({type:'error', text:'Invalid JSON'})
    }
    setSaving(false)
  }

  function updateAdvancedSetting(category, key, value) {
    setAdvancedSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  async function saveAdvancedSettings() {
    setSaving(true)
    try {
      const res = await fetch('/api/advanced-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: advancedSettings })
      })
      
      if (res.ok) {
        toast({
          title: 'Advanced settings saved',
          status: 'success',
          duration: 2000,
          isClosable: true
        })
      } else {
        throw new Error('Save failed')
      }
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    } finally {
      setSaving(false)
    }
  }   hash_algorithm: 'xxhash',
      skip_unchanged: true,
      verify_size_only: false,
      cache_expiry_days: 30,
      rescan_threshold_percent: 10,
    },
    ai_scene_detection: {
      enabled: false,
      provider: 'local',
      openai_api_key: '',
      scene_threshold: 0.7,
      min_scene_duration_sec: 3,
      max_highlight_duration_sec: 60,
      auto_generate_highlights: true,
      highlight_per_flight: true,
      extract_frame_interval_sec: 2,
    },
    ai_training: {
      labels_path: '/media/labels.json',
      library_path: '/media',
      model_path: '/tmp/training/model.pth',
    },
    flight_path_3d: {
      enabled: false,
      <Tabs colorScheme="purple" variant="enclosed">
        <TabList mb={4} borderColor="whiteAlpha.400" flexWrap="wrap">
          <Tab 
            color="whiteAlpha.800" 
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.300', 
              borderColor: 'whiteAlpha.500',
              borderBottomColor: 'transparent',
              fontWeight: 'bold'
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Basic Config
          </Tab>
          <Tab 
            color="whiteAlpha.800"
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.300', 
              borderColor: 'whiteAlpha.500',
              borderBottomColor: 'transparent',
              fontWeight: 'bold'
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Appearance
          </Tab>
          <Tab 
            color="whiteAlpha.800"
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.300', 
              borderColor: 'whiteAlpha.500',
              borderBottomColor: 'transparent',
              fontWeight: 'bold'
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Parallel Processing
          </Tab>
          <Tab 
            color="whiteAlpha.800"
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.300', 
              borderColor: 'whiteAlpha.500',
              borderBottomColor: 'transparent',
              fontWeight: 'bold'
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Storage Analytics
          </Tab>
          <Tab 
            color="whiteAlpha.800"
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.300', 
              borderColor: 'whiteAlpha.500',
              borderBottomColor: 'transparent',
              fontWeight: 'bold'
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Incremental Sync
          </Tab>
          <Tab 
            color="whiteAlpha.800"
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.300', 
              borderColor: 'whiteAlpha.500',
              borderBottomColor: 'transparent',
              fontWeight: 'bold'
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            AI Training
          </Tab>
          <Tab 
            color="whiteAlpha.800"
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.300', 
              borderColor: 'whiteAlpha.500',
              borderBottomColor: 'transparent',
              fontWeight: 'bold'
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Flight Paths
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack align="stretch">
              <Text color="whiteAlpha.800" fontSize="sm" mb={2}>
                Direct JSON configuration for devices and theme settings
              </Text>
              <Textarea 
                value={configText} 
                onChange={(e)=>setConfigText(e.target.value)} 
                minH="360px" 
                fontFamily="monospace"
                bg="whiteAlpha.200"
                borderColor="whiteAlpha.400"
                color="white"
                _placeholder={{ color: 'whiteAlpha.600' }}
              />

              <HStack spacing={3} pt={2}>
                <Button 
                  onClick={save} 
                  isLoading={saving}
                  background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                  color="white"
                  _hover={{ opacity: 0.9 }}
                >
                  Save
                </Button>
                <Button 
                  onClick={()=>{ setMessage(null); setSaving(false); window.location.reload() }} 
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.500"
                  bg="whiteAlpha.200"
                  _hover={{ bg: 'whiteAlpha.300', borderColor: 'whiteAlpha.700' }}
                >
                  Reload
                </Button>
                {message && <Text color={message.type==='success' ? 'green.300' : 'red.300'}>{message.text}</Text>}
              </HStack>
            </VStack>
          </TabPanel>

          <TabPanel>
            <AppearanceSettings />
          </TabPanel>

          <TabPanel>
            <ParallelProcessing settings={advancedSettings} updateSetting={updateAdvancedSetting} />
            <Divider my={6} borderColor="whiteAlpha.400" />
            <HStack justify="flex-end">
              <Button 
                onClick={saveAdvancedSettings}
                isLoading={saving}
                background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                color="white"
                _hover={{ opacity: 0.9 }}
                size="lg"
              >
                Save Settings
              </Button>
            </HStack>
          </TabPanel>

          <TabPanel>
            <StorageAnalytics settings={advancedSettings} updateSetting={updateAdvancedSetting} />
            <Divider my={6} borderColor="whiteAlpha.400" />
            <HStack justify="flex-end">
              <Button 
                onClick={saveAdvancedSettings}
                isLoading={saving}
                background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                color="white"
                _hover={{ opacity: 0.9 }}
                size="lg"
              >
                Save Settings
              </Button>
            </HStack>
          </TabPanel>

          <TabPanel>
            <IncrementalSync settings={advancedSettings} updateSetting={updateAdvancedSetting} />
            <Divider my={6} borderColor="whiteAlpha.400" />
            <HStack justify="flex-end">
              <Button 
                onClick={saveAdvancedSettings}
                isLoading={saving}
                background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                color="white"
                _hover={{ opacity: 0.9 }}
                size="lg"
              >
                Save Settings
              </Button>
            </HStack>
          </TabPanel>

          <TabPanel>
            <AISettings settings={advancedSettings} updateSetting={updateAdvancedSetting} />
            <Divider my={6} borderColor="whiteAlpha.400" />
            <HStack justify="flex-end">
              <Button 
                onClick={saveAdvancedSettings}
                isLoading={saving}
                background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                color="white"
                _hover={{ opacity: 0.9 }}
                size="lg"
              >
                Save Settings
              </Button>
            </HStack>
          </TabPanel>

          <TabPanel>
            <FlightPath3D settings={advancedSettings} updateSetting={updateAdvancedSetting} />
            <Divider my={6} borderColor="whiteAlpha.400" />
            <HStack justify="flex-end">
              <Button 
                onClick={saveAdvancedSettings}
                isLoading={saving}
                background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                color="white"
                _hover={{ opacity: 0.9 }}
                size="lg"
              >
                Save Settings
              </Button>
            </HStack>
          </TabPanel>
        </TabPanels>
      </Tabs> <Textarea 
                value={configText} 
                onChange={(e)=>setConfigText(e.target.value)} 
                minH="360px" 
                fontFamily="monospace"
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.300"
              />

              <HStack spacing={3} pt={2}>
                <Button 
                  onClick={save} 
                  isLoading={saving}
                  background="var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))"
                  color="white"
                  _hover={{ opacity: 0.9 }}
                >
                  Save
                </Button>
                <Button 
                  onClick={()=>{ setMessage(null); setSaving(false); window.location.reload() }} 
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.400"
                  bg="whiteAlpha.100"
                  _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.600' }}
                >
                  Reload
                </Button>
                {message && <Text color={message.type==='success' ? 'green.300' : 'red.300'}>{message.text}</Text>}
              </HStack>
            </VStack>
          </TabPanel>

          <TabPanel>
            <AdvancedSettings />
          </TabPanel>

          <TabPanel>
            <AppearanceSettings />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layout>
  )
}
