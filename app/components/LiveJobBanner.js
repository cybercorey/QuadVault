import { useState, useEffect } from 'react'
import { Box, Progress, Text, HStack, Spinner } from '@chakra-ui/react'
import useSocket from '../lib/useSocket'

export default function LiveJobBanner(){
  const [job, setJob] = useState(null)
  
  useSocket('job-progress', (data)=>{ setJob(data) })
  useSocket('job-complete', ()=>{ setJob(null) })
  
  if(!job) return null
  
  return (
    <Box 
      background="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" 
      color="white" 
      p={4} 
      borderRadius="6px" 
      mb={4}
    >
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="600">Job in Progress</Text>
        <Spinner size="sm" />
      </HStack>
      <Text fontSize="sm" mb={2} isTruncated>{job.file || 'Processing...'}</Text>
      <Progress 
        value={job.percent || 0} 
        size="sm" 
        hasStripe 
        isAnimated
        sx={{
          '& > div': {
            background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,1) 100%)'
          }
        }}
      />
      <Text fontSize="xs" mt={1}>{job.percent || 0}%</Text>
    </Box>
  )
}
