import { useEffect, useState } from 'react'
import io from 'socket.io-client'

let socket = null

export default function useSocket(event, callback){
  useEffect(()=>{
    if(!socket){
      socket = io({ transports: ['websocket','polling'], autoConnect: true })
      socket.on('connect', ()=> console.log('Socket connected'))
      socket.on('connect_error', (err)=> console.warn('Socket connect_error', err && err.message))
      socket.on('reconnect_attempt', ()=> console.log('Socket reconnecting'))
    }
    if(event && callback) socket.on(event, callback)
    return ()=>{ if(event && callback) socket.off(event, callback) }
  }, [event, callback])

  return socket
}

export function getSocket(){
  if(!socket) socket = io({ transports: ['websocket','polling'], autoConnect: true })
  return socket
}
