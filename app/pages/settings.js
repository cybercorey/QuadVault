import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import AdvancedSettings from '../components/AdvancedSettings'
import AppearanceSettings from '../components/AppearanceSettings'
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
  TabPanel 
} from '@chakra-ui/react'

export default function Settings(){
  const [configText, setConfigText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(()=>{
    fetch('/api/config').then(r=>r.json()).then(data=>{
      setConfigText(JSON.stringify(data, null, 2))
    }).catch(()=>setConfigText('// failed to load'))
  }, [])

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

  return (
    <Layout>
      <Heading size="md" mb={4}>Settings</Heading>

      <Tabs colorScheme="purple" variant="enclosed">
        <TabList mb={4} borderColor="whiteAlpha.300">
          <Tab 
            color="whiteAlpha.700" 
            _selected={{ 
              color: 'white', 
              bg: 'whiteAlpha.200', 
              borderColor: 'whiteAlpha.400',
              borderBottomColor: 'transparent'
            }}
          >
            Basic Config
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
            Advanced Features
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
            Appearance
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack align="stretch">
              <Text color="whiteAlpha.600" fontSize="sm" mb={2}>
                Direct JSON configuration for devices and theme settings
              </Text>
              <Textarea 
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
