// API endpoint to get worker capabilities
// Returns information about GPU support, stabilization availability, etc.

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Try to get capabilities from server module (updated via socket)
        let capabilities;
        try {
            const serverModule = require('../../server');
            if (serverModule && serverModule.getWorkerCapabilities) {
                capabilities = serverModule.getWorkerCapabilities();
            }
        } catch (e) {
            // Server module not available (shouldn't happen but fallback anyway)
            console.warn('[capabilities] Could not access server module:', e.message);
        }

        // Default capabilities if not available from worker
        if (!capabilities) {
            capabilities = {
                gpu_support: true,
                gpu_available: true,
                stabilization_enabled: true,
                merge_enabled: true,
                sync_enabled: true
            };
        }

        res.status(200).json({
            ...capabilities,
            last_updated: Date.now()
        });
    } catch (error) {
        console.error('[capabilities] Error:', error);
        res.status(500).json({ error: error.message });
    }
}
