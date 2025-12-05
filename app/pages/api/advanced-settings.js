const fs = require('fs-extra');
const path = require('path');

const CONFIG_FILE = '/app/config.json';

// Default settings
const DEFAULT_SETTINGS = {
  parallel_processing: {
    enabled: false,
    max_concurrent_devices: 2,
    max_concurrent_jobs: 4,
    priority_mode: 'fifo',
    per_device_bandwidth_limit_mbps: 0,
  },
  storage_analytics: {
    enabled: true,
    compute_interval_hours: 24,
    track_per_device: true,
    track_file_types: true,
    duplicate_detection: true,
    duplicate_min_size_mb: 10,
    retention_days: 365,
  },
  incremental_sync: {
    enabled: false,
    hash_algorithm: 'xxhash',
    skip_unchanged: true,
    verify_size_only: false,
    cache_expiry_days: 30,
    rescan_threshold_percent: 10,
  },
  ai_scene_detection: {
    enabled: false,
    provider: 'openai',
    openai_api_key: '',
    scene_threshold: 0.7,
    min_scene_duration_sec: 3,
    max_highlight_duration_sec: 60,
    auto_generate_highlights: true,
    highlight_per_flight: true,
    detect_categories: ['sunset', 'action', 'landscape', 'smooth_flight', 'proximity'],
    extract_frame_interval_sec: 2,
  },
  flight_path_3d: {
    enabled: false,
    parse_telemetry: true,
    supported_formats: ['dji_srt', 'gopro_gpmf', 'insta360'],
    map_provider: 'mapbox',
    mapbox_token: '',
    default_altitude_meters: 100,
    path_color: '#8b5cf6',
    show_waypoints: true,
    show_altitude_graph: true,
    export_kml: false,
  }
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Load settings from config.json
      let settings = DEFAULT_SETTINGS;
      
      if (await fs.pathExists(CONFIG_FILE)) {
        const config = await fs.readJson(CONFIG_FILE);
        const fileData = config.advanced_settings || {};
        
        // Merge with defaults to handle new settings
        settings = {
          ...DEFAULT_SETTINGS,
          ...fileData,
          // Deep merge each category
          parallel_processing: { ...DEFAULT_SETTINGS.parallel_processing, ...(fileData.parallel_processing || {}) },
          storage_analytics: { ...DEFAULT_SETTINGS.storage_analytics, ...(fileData.storage_analytics || {}) },
          incremental_sync: { ...DEFAULT_SETTINGS.incremental_sync, ...(fileData.incremental_sync || {}) },
          ai_scene_detection: { ...DEFAULT_SETTINGS.ai_scene_detection, ...(fileData.ai_scene_detection || {}) },
          flight_path_3d: { ...DEFAULT_SETTINGS.flight_path_3d, ...(fileData.flight_path_3d || {}) },
        };
      }
      
      return res.json({ success: true, settings });
    } catch (err) {
      console.error('Failed to load advanced settings:', err);
      return res.status(500).json({ error: 'Failed to load settings' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const { settings } = req.body;
      
      if (!settings) {
        return res.status(400).json({ error: 'Missing settings' });
      }
      
      // Load existing config
      let config = { devices: [], theme: {} };
      if (await fs.pathExists(CONFIG_FILE)) {
        config = await fs.readJson(CONFIG_FILE);
      }
      
      // Update advanced_settings in config
      config.advanced_settings = settings;
      
      // Save back to config.json
      await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
      
      return res.json({ success: true });
    } catch (err) {
      console.error('Failed to save advanced settings:', err);
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
