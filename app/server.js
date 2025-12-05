const next = require('next');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs-extra');

const { setIo, pushLog } = require('./lib/socket');
const { loadPersisted, computeStorage } = require('./lib/storage');

// Store worker capabilities
let workerCapabilities = {
    gpu_support: true,
    gpu_available: true,
    stabilization_enabled: true,
    merge_enabled: true,
    sync_enabled: true
};

function getWorkerCapabilities() {
    return workerCapabilities;
}

function setWorkerCapabilities(caps) {
    workerCapabilities = { ...caps };
    console.log('[Server] Worker capabilities updated:', workerCapabilities);
}

// Export for use in API routes
module.exports.getWorkerCapabilities = getWorkerCapabilities;

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
        
        // Handle worker capability updates
        socket.on('worker_capabilities', (data) => {
            console.log('[Socket.io] Received worker_capabilities from', socket.id);
            setWorkerCapabilities(data);
            // Broadcast to all clients so UI can update
            io.emit('worker_capabilities', data);
        });
        
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
            // Store log in buffer for API access
            if (data && data.entry) {
                pushLog(data.entry);
            }
            io.emit('job_log', data);
        });
        
        socket.on('log', (data) => {
            console.log('[Socket.io] Received log event from', socket.id);
            // Store log in buffer for API access
            pushLog(data);
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
