// Use global to persist io across Next.js module reloads in development
if (!global.socketIo) {
    global.socketIo = null;
}

function getIo() {
    return global.socketIo;
}

// keep a buffer of recent log entries so clients can fetch history
const logsBuffer = []
function pushLog(payload){
    try{
        logsBuffer.push(payload)
        while(logsBuffer.length > 400) logsBuffer.shift()
    }catch(e){}
}

function setIo(serverIo) {
    global.socketIo = serverIo;
    console.log('[socket.js] setIo called, io is now:', serverIo ? 'SET' : 'NULL');
}

function emitLog(payload){
    const io = getIo();
    if(io) io.emit('log', payload);
    pushLog(payload)
    try { console.log('[emitLog]', JSON.stringify(payload)) } catch(e){ console.log('[emitLog]') }
}
function emitProgress(payload){ 
    const io = getIo();
    try { console.log('[emitProgress] io=' + (io ? 'exists' : 'NULL'), JSON.stringify(payload)) } catch(e){ console.log('[emitProgress] io=' + (io ? 'exists' : 'NULL')) }
    if(io) {
        io.emit('progress', payload);
    } else {
        console.log('[emitProgress] ERROR: io is null, cannot emit progress event');
    }
}
function emitStorage(payload){
    const io = getIo();
    if(io) io.emit('storage', payload);
    try { console.log('[emitStorage]', JSON.stringify(payload)) } catch(e){ console.log('[emitStorage]') }
}
function emitJobComplete(payload){ 
    const io = getIo();
    try { console.log('[emitJobComplete] io=' + (io ? 'exists' : 'NULL'), JSON.stringify(payload)) } catch(e){ console.log('[emitJobComplete] io=' + (io ? 'exists' : 'NULL')) }
    if(io) {
        io.emit('job_complete', payload);
    } else {
        console.log('[emitJobComplete] ERROR: io is null, cannot emit job_complete event');
    }
}
function emitJobLog(payload){ const io = getIo(); if(io) io.emit('job_log', payload); }
function emitJobQueued(payload){ 
    const io = getIo();
    try { console.log('[emitJobQueued] io=' + (io ? 'exists' : 'NULL'), JSON.stringify(payload)) } catch(e){ console.log('[emitJobQueued] io=' + (io ? 'exists' : 'NULL')) }
    if(io) {
        io.emit('job_queued', payload);
    } else {
        console.log('[emitJobQueued] ERROR: io is null, cannot emit job_queued event');
    }
}

function getRecentLogs(){ return logsBuffer.slice(-400) }

module.exports = { setIo, emitLog, emitProgress, emitStorage, emitJobComplete, emitJobLog, emitJobQueued, getRecentLogs };
