import { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Button, Progress } from '@chakra-ui/react'
import { FiDatabase } from 'react-icons/fi'
import useSocket from '../lib/useSocket'

export default function StorageInfo({ compact=false }){
  const [storage, setStorage] = useState({ total:null, avail:null, children:[], lastUpdated:null, computing:false })
  const [refreshing, setRefreshing] = useState(false)
  
  // Load initial storage data on mount
  useEffect(()=>{ load() }, [])
  
  async function load(){
    try{
      const r = await fetch('/api/storage')
      const j = await r.json()
      setStorage(j)
      try{ localStorage.setItem('ua:storage', JSON.stringify(j)) }catch(e){}
    }catch(e){ /* ignore */ }
  }

  async function refresh(){
    try{
      setRefreshing(true)
      await fetch('/api/storage/refresh', { method:'POST' })
    }catch(e){ 
      setRefreshing(false) 
    }
  }

  // listen for server 'storage' events to update the UI in real-time
  useSocket('storage', (payload)=>{
    if(payload){
      setStorage(payload)
      setRefreshing(false) // Stop refreshing spinner when new data arrives
      try{ localStorage.setItem('ua:storage', JSON.stringify(payload)) }catch(e){}
    }
  })
  
  const usedBytes = storage.total && storage.avail != null ? (storage.total - storage.avail) : null
  const usedPercent = (storage.total && usedBytes != null) ? Math.round((usedBytes / storage.total) * 100) : 0
  const formatSize = (bytes)=>{ if(bytes==null) return '-'; const k=1024; const sizes=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return Math.round(bytes/Math.pow(k,i)*100)/100+' '+sizes[i] }
  
  if(compact){
    const formatShort = (bytes)=>{
      if(bytes==null) return '-'
      const tb = 1024*1024*1024*1024
      const gb = 1024*1024*1024
      if(bytes >= tb) return (Math.round((bytes/tb)*100)/100)+' TB'
      return (Math.round((bytes/gb)*100)/100)+' GB'
    }
    return (
      <HStack spacing={3} align="center">
        <Box as={FiDatabase} />
        <VStack spacing={0} align="stretch">
          <HStack spacing={2} align="center">
            <Text fontSize="sm" color="whiteAlpha.700">{usedBytes!=null ? formatShort(usedBytes) : '—'}</Text>
            <Text fontSize="xs" color="whiteAlpha.600">/ {storage.total ? formatShort(storage.total) : '-'}</Text>
            <Text fontSize="xs" color="whiteAlpha.500">{usedPercent}%</Text>
          </HStack>
          <Progress 
            value={usedPercent} 
            size="xs" 
            w="110px"
            sx={{
              '& > div': {
                background: 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))'
              }
            }}
          />
        </VStack>
        <Button 
          size="xs" 
          onClick={refresh} 
          isLoading={refreshing||storage.computing} 
          variant="ghost"
          color="white"
          _hover={{ bg: 'whiteAlpha.200' }}
        >
          Refresh
        </Button>
      </HStack>
    )
  }

  return (
    <Box bg="brand.panel" borderRadius="8px" border="1px solid" borderColor="whiteAlpha.100" p={4}>
      <HStack justify="space-between" mb={3}>
        <HStack>
          <Box as={FiDatabase} mr={2} />
          <Text fontWeight="600" fontSize="lg">Storage</Text>
        </HStack>
        <Button 
          size="sm" 
          onClick={refresh} 
          isLoading={refreshing||storage.computing} 
          variant="outline"
          color="white"
          borderColor="whiteAlpha.400"
          bg="whiteAlpha.100"
          _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.600' }}
        >
          Refresh
        </Button>
      </HStack>
      {storage.total ? (
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between"><Text fontSize="sm" color="whiteAlpha.800">Used</Text><Text fontSize="sm" fontWeight="600">{formatSize(usedBytes)} ({usedPercent}%)</Text></HStack>
          <Progress 
            value={usedPercent} 
            size="sm"
            sx={{
              '& > div': {
                background: 'var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))'
              }
            }}
          />
          <HStack justify="space-between"><Text fontSize="sm" color="whiteAlpha.800">Available</Text><Text fontSize="sm" fontWeight="600">{formatSize(storage.avail)}</Text></HStack>
          <HStack justify="space-between"><Text fontSize="sm" color="whiteAlpha.800">Total</Text><Text fontSize="sm" fontWeight="600">{formatSize(storage.total)}</Text></HStack>
          {storage.lastUpdated && <Text fontSize="xs" color="whiteAlpha.600">Cached {Math.round((Date.now()-storage.lastUpdated)/1000)}s ago</Text>}
        </VStack>
      ) : <Text fontSize="sm" color="brand.muted">Storage data not available yet.</Text>}
    </Box>
  )
}
