const fs = require('fs-extra');

const SETTINGS_FILE = '/app/advanced-settings.json';

// Cache for settings to avoid repeated file reads
let settingsCache = null;
let lastLoadTime = 0;
const CACHE_TTL = 5000; // 5 seconds

async function getAdvancedSettings() {
  const now = Date.now();
  
  // Return cached settings if fresh
  if (settingsCache && (now - lastLoadTime) < CACHE_TTL) {
    return settingsCache;
  }
  
  try {
    if (await fs.pathExists(SETTINGS_FILE)) {
      settingsCache = await fs.readJson(SETTINGS_FILE);
      lastLoadTime = now;
      return settingsCache;
    }
  } catch (err) {
    console.error('[Settings] Failed to load:', err.message);
  }
  
  // Return defaults if file doesn't exist or read fails
  const defaults = {
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
  
  settingsCache = defaults;
  lastLoadTime = now;
  return defaults;
}

// Invalidate cache when settings are updated
function invalidateCache() {
  settingsCache = null;
  lastLoadTime = 0;
}

module.exports = {
  getAdvancedSettings,
  invalidateCache
};
