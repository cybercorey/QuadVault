const fs = require('fs-extra');
const path = require('path');

/**
 * Parse DJI SRT subtitle files for GPS/telemetry data
 */
async function parseDJISRT(srtPath) {
  try {
    const content = await fs.readFile(srtPath, 'utf8');
    const entries = content.split('\n\n');
    const telemetry = [];
    
    for (const entry of entries) {
      const lines = entry.trim().split('\n');
      if (lines.length < 3) continue;
      
      // Line 0: sequence number
      // Line 1: timestamp
      // Line 2+: telemetry data
      
      const dataLine = lines.slice(2).join(' ');
      
      // Extract GPS coordinates (format varies)
      const latMatch = dataLine.match(/GPS\s*\(([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
      const altMatch = dataLine.match(/altitude:\s*([\d.]+)/i) || dataLine.match(/rel_alt:\s*([\d.]+)/i);
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2})/);
      
      if (latMatch && latMatch.length >= 3) {
        const lat = parseFloat(latMatch[1]);
        const lon = parseFloat(latMatch[2]);
        const alt = altMatch ? parseFloat(altMatch[1]) : 0;
        
        if (!isNaN(lat) && !isNaN(lon)) {
          telemetry.push({
            timestamp: timeMatch ? timeMatch[1] : '',
            latitude: lat,
            longitude: lon,
            altitude: alt,
            raw: dataLine
          });
        }
      }
    }
    
    return telemetry;
  } catch (err) {
    console.error('[Telemetry] Failed to parse DJI SRT:', err.message);
    return [];
  }
}

/**
 * Find telemetry file for video
 */
async function findTelemetryFile(videoPath) {
  const dir = path.dirname(videoPath);
  const basename = path.basename(videoPath, path.extname(videoPath));
  
  // Check for common telemetry file patterns
  const patterns = [
    `${basename}.SRT`,
    `${basename}.srt`,
    `${basename}.gpx`,
    `${basename}.kml`
  ];
  
  for (const pattern of patterns) {
    const telemetryPath = path.join(dir, pattern);
    if (await fs.pathExists(telemetryPath)) {
      return { path: telemetryPath, format: path.extname(pattern).toLowerCase().substring(1) };
    }
  }
  
  return null;
}

/**
 * Extract telemetry from video file
 */
async function extractTelemetry(videoPath, settings) {
  if (!settings.flight_path_3d?.enabled || !settings.flight_path_3d?.parse_telemetry) {
    return null;
  }
  
  const telemetryFile = await findTelemetryFile(videoPath);
  
  if (!telemetryFile) {
    console.log('[Telemetry] No telemetry file found for:', path.basename(videoPath));
    return null;
  }
  
  console.log('[Telemetry] Found telemetry file:', telemetryFile.path);
  
  let telemetry = [];
  
  if (telemetryFile.format === 'srt') {
    telemetry = await parseDJISRT(telemetryFile.path);
  }
  // Add more parsers for other formats (GPX, KML, GPMF) as needed
  
  if (telemetry.length === 0) {
    console.warn('[Telemetry] No GPS data extracted');
    return null;
  }
  
  console.log(`[Telemetry] Extracted ${telemetry.length} GPS points`);
  
  // Calculate bounding box
  const lats = telemetry.map(t => t.latitude);
  const lons = telemetry.map(t => t.longitude);
  const alts = telemetry.map(t => t.altitude);
  
  return {
    points: telemetry,
    bounds: {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
      minAlt: Math.min(...alts),
      maxAlt: Math.max(...alts)
    },
    video: path.basename(videoPath)
  };
}

/**
 * Export telemetry as KML
 */
async function exportKML(telemetryData, outputPath, settings) {
  if (!telemetryData || !settings.flight_path_3d?.export_kml) {
    return null;
  }
  
  try {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${telemetryData.video} - Flight Path</name>
    <Style id="flightPath">
      <LineStyle>
        <color>ff${settings.flight_path_3d.path_color.substring(1)}</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Flight Path</name>
      <styleUrl>#flightPath</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
${telemetryData.points.map(p => `          ${p.longitude},${p.latitude},${p.altitude}`).join('\n')}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
    
    await fs.writeFile(outputPath, kml);
    console.log('[Telemetry] KML exported:', outputPath);
    return outputPath;
  } catch (err) {
    console.error('[Telemetry] KML export failed:', err.message);
    return null;
  }
}

module.exports = {
  findTelemetryFile,
  extractTelemetry,
  exportKML,
  parseDJISRT
};
