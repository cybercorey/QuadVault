const next = require('next');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs-extra');

const { setIo } = require('./lib/socket');
const { loadPersisted, computeStorage } = require('./lib/storage');

const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Start next server and attach socket.io
nextApp.prepare().then(() => {
    const server = http.createServer((req, res) => handle(req, res));
    const io = new Server(server);
    setIo(io);

    io.on('connection', (socket) => {
        console.log('[Socket.io] Client connected:', socket.id);
        
        // When worker sends events to server, broadcast them to all clients
        socket.on('progress', (data) => {
            console.log('[Socket.io] Received progress event from', socket.id, '- broadcasting to all clients');
            io.emit('progress', data);
        });
        
        socket.on('job_complete', (data) => {
            console.log('[Socket.io] Received job_complete event from', socket.id, '- broadcasting to all clients');
            io.emit('job_complete', data);
        });
        
        socket.on('job_log', (data) => {
            console.log('[Socket.io] Received job_log event from', socket.id);
            io.emit('job_log', data);
        });
        
        socket.on('log', (data) => {
            console.log('[Socket.io] Received log event from', socket.id);
            io.emit('log', data);
        });
        
        socket.on('disconnect', () => {
            console.log('[Socket.io] Client disconnected:', socket.id);
        });
    });

    // load persisted storage cache and kick off compute on startup
    loadPersisted().catch(()=>{}); // Make async call
    computeStorage().catch(()=>{});

    server.listen(PORT, () => console.log(`Next.js server running on ${PORT}`));
}).catch(err => {
    console.error('Failed to start Next.js:', err);
});
