import { useState, useEffect, useRef } from 'react'
import { Box, HStack, Text, VStack, Button, IconButton, Tooltip } from '@chakra-ui/react'
import { FiTerminal, FiTrash2, FiChevronsDown } from 'react-icons/fi'
import useSocket, { getSocket } from '../lib/useSocket'

export default function LiveLog(){
  const [logs, setLogs] = useState([])
  const [autoScroll, setAutoScroll] = useState(true)
  const boxRef = useRef(null)
  const lastTsRef = useRef(0)
  
  useEffect(()=>{ // load recent logs once
    let mounted = true
    fetch('/api/logs').then(r=>r.json()).then(j=>{ if(!mounted) return; if(j && j.logs){ const rows = (j.logs||[]); setLogs(rows); if(rows.length) lastTsRef.current = Math.max(lastTsRef.current, new Date(rows[rows.length - 1].timestamp).getTime()||0) } }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [])

  // Listen to socket for new logs in real-time
  useEffect(()=>{
    const sock = getSocket()
    function handler(payload){
      const entry = typeof payload === 'object' && payload !== null ? payload : { msg: String(payload) }
      entry.timestamp = entry.timestamp || Date.now()
      setLogs(l=>{
        const key = `${entry.timestamp}|${entry.msg||entry.message||''}`
        // avoid duplicates
        if(l.find(x=>`${x.timestamp}|${(x.msg||x.message||'')}` === key)) return l.slice(-400)
        const next = [...l, entry].slice(-400) // newest-last
        try{ lastTsRef.current = Math.max(lastTsRef.current, new Date(entry.timestamp).getTime()||0) }catch(e){}
        return next
      })
    }
    sock.on('log', handler)
    return ()=>{ try{ sock.off('log', handler) }catch(e){} }
  }, [])
  
  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (autoScroll && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight
    }
  }, [logs, autoScroll])
  
  function handleScroll(e) {
    // Disable auto-scroll if user scrolls up manually
    const { scrollTop, scrollHeight, clientHeight } = e.target
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false)
    }
  }
  
  function clearLogs(){ setLogs([]) }
  
  function toggleAutoScroll() {
    const newValue = !autoScroll
    setAutoScroll(newValue)
    if (newValue && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight
    }
  }
  
  return (
    <Box bg="brand.panel" borderRadius="8px" border="1px solid" borderColor="whiteAlpha.100" p={4} pt={4}>
      <HStack spacing={3} mb={4} justify="space-between">
        <HStack spacing={3}>
          <FiTerminal size={20} />
          <Text fontWeight="600" fontSize="lg">Logs</Text>
        </HStack>
        <HStack spacing={2}>
          <Tooltip label={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}>
            <IconButton
              size="sm"
              icon={<FiChevronsDown />}
              onClick={toggleAutoScroll}
              variant={autoScroll ? "solid" : "ghost"}
              colorScheme={autoScroll ? "purple" : "gray"}
              color={autoScroll ? "white" : "whiteAlpha.700"}
              _hover={{ bg: autoScroll ? 'purple.600' : 'whiteAlpha.200' }}
              aria-label="Toggle auto-scroll"
            />
          </Tooltip>
          <Button size="sm" leftIcon={<FiTrash2 />} onClick={clearLogs} variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}>Clear</Button>
        </HStack>
      </HStack>
      <VStack ref={boxRef} onScroll={handleScroll} align="stretch" bg="black" p={3} borderRadius="6px" border="1px solid" borderColor="whiteAlpha.100" fontFamily="monospace" fontSize="xs" maxH="300px" overflowY="auto" spacing={1}>
        {logs.length ? logs.map((l,i)=>{
          const ts = new Date(l.timestamp).toLocaleTimeString()
          const color = l.type==='error' ? 'red.400' : l.type==='warn' ? 'yellow.400' : 'whiteAlpha.800'
          return (
            <HStack key={i} align="start" spacing={2}>
              <Text color="whiteAlpha.500" minW="58px" textAlign="right">{ts}</Text>
              <Text flex="1" color={color}>{l.msg || l.message || JSON.stringify(l)}</Text>
            </HStack>
          )
        }) : <Text color="whiteAlpha.600">No logs yet...</Text>}
      </VStack>
    </Box>
  )
}
