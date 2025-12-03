import { useState, useEffect, useRef } from 'react'
import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { FiTerminal } from 'react-icons/fi'
import useSocket, { getSocket } from '../lib/useSocket'

export default function LiveLog(){
  const [logs, setLogs] = useState([])
  const boxRef = useRef(null)
  const lastTsRef = useRef(0)
  
  useEffect(()=>{ // load recent logs once
    let mounted = true
    fetch('/api/logs').then(r=>r.json()).then(j=>{ if(!mounted) return; if(j && j.logs){ const rows = (j.logs||[]).slice().reverse(); setLogs(rows); if(rows.length) lastTsRef.current = Math.max(lastTsRef.current, new Date(rows[0].timestamp).getTime()||0) } }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [])

  // prefer direct subscription so we can control handler lifecycle
  useEffect(()=>{
    const sock = getSocket()
    function handler(payload){
      const entry = typeof payload === 'object' && payload !== null ? payload : { msg: String(payload) }
      entry.timestamp = entry.timestamp || Date.now()
      setLogs(l=>{
        const key = `${entry.timestamp}|${entry.msg||entry.message||''}`
        // avoid duplicate when both poll and socket deliver the same entry
        if(l.find(x=>`${x.timestamp}|${(x.msg||x.message||'')}` === key)) return l.slice(0,400)
        const next = [entry, ...l].slice(0,400) // newest-first
        try{ lastTsRef.current = Math.max(lastTsRef.current, new Date(entry.timestamp).getTime()||0) }catch(e){}
        return next
      })
    }
    sock.on('log', handler)
    return ()=>{ try{ sock.off('log', handler) }catch(e){} }
  }, [])

  // Poll as a fallback in case socket messages are lost — ensures 'live' behavior
  useEffect(()=>{
    let mounted = true
    let lastTs = lastTsRef.current || 0
    const tick = async ()=>{
      try{
        const r = await fetch('/api/logs')
        if(!r.ok) return
        const j = await r.json()
        if(!mounted || !j || !j.logs) return
        // append only newer entries
        const newEntries = (j.logs || []).filter(e=>{
          const t = new Date(e.timestamp).getTime() || 0
          return t > lastTs
        })
        if(newEntries.length){
          lastTs = Math.max(lastTs, ...newEntries.map(e=>new Date(e.timestamp).getTime()||0))
          setLogs(l=>{
            const existingKeys = new Set(l.map(x => `${x.timestamp}|${(x.msg||x.message||'')}`))
            const merged = [...l]
            for(const entry of newEntries){
              const key = `${entry.timestamp}|${entry.msg||entry.message||''}`
              if(!existingKeys.has(key)) { merged.push(entry); existingKeys.add(key) }
            }
            // Sort all logs newest first by timestamp
            const sorted = merged.sort((a,b)=>{
              const timeA = new Date(a.timestamp).getTime() || 0
              const timeB = new Date(b.timestamp).getTime() || 0
              return timeB - timeA
            })
            const trimmed = sorted.slice(0,400)
            try{ lastTsRef.current = Math.max(lastTsRef.current, ...trimmed.map(x=>new Date(x.timestamp).getTime()||0)) }catch(e){}
            return trimmed
          })
        }
      }catch(e){ /* ignore */ }
    }
    // first run immediately so UI picks up any server buffered logs as soon as mounted
    tick()
    const id = setInterval(tick, 2000)
    return ()=>{ mounted = false; clearInterval(id) }
  }, [])
  
  function handleScroll(/* e */){ /* newest-first UI does not auto-scroll */ }
  
  return (
    <Box bg="brand.panel" borderRadius="8px" border="1px solid" borderColor="whiteAlpha.100" p={4} pt={4}>
      <HStack spacing={3} mb={4}>
        <FiTerminal size={20} />
        <Text fontWeight="600" fontSize="lg">Logs</Text>
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
