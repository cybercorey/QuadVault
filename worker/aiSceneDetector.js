const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Extract frames from video at specified intervals
 */
async function extractFrames(videoPath, outputDir, intervalSec = 2) {
  await fs.ensureDir(outputDir);
  
  try {
    // Use ffmpeg to extract frames
    const cmd = `ffmpeg -i "${videoPath}" -vf "fps=1/${intervalSec}" "${outputDir}/frame_%04d.jpg" -y`;
    execSync(cmd, { stdio: 'pipe' });
    
    // Get list of extracted frames
    const frames = await fs.readdir(outputDir);
    return frames
      .filter(f => f.endsWith('.jpg'))
      .map(f => path.join(outputDir, f))
      .sort();
  } catch (err) {
    console.error('[AI Scene] Frame extraction failed:', err.message);
    return [];
  }
}

/**
 * Analyze frame with OpenAI Vision API
 */
async function analyzeFrameOpenAI(framePath, apiKey, categories) {
  try {
    const imageBuffer = await fs.readFile(framePath);
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `Analyze this drone/FPV footage frame. Rate each category from 0-1:
${categories.map(c => `- ${c.replace('_', ' ')}`).join('\n')}

Respond ONLY with JSON: {"sunset": 0.8, "action": 0.3, "landscape": 0.9, "smooth_flight": 0.5, "proximity": 0.1}`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });
    
    const data = await response.json();
    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      // Try to parse JSON response
      try {
        return JSON.parse(content);
      } catch {
        // If not valid JSON, try to extract scores
        console.warn('[AI Scene] Could not parse response as JSON:', content);
        return null;
      }
    }
  } catch (err) {
    console.error('[AI Scene] OpenAI API error:', err.message);
  }
  return null;
}

/**
 * Analyze frame with local model (placeholder - would need actual ML implementation)
 */
async function analyzeFrameLocal(framePath, categories) {
  // This is a placeholder - in production you'd use:
  // - CLIP model for image understanding
  // - TensorFlow.js or ONNX runtime
  // - Pre-trained drone footage classifier
  
  // For now, return random scores as demo
  const scores = {};
  for (const cat of categories) {
    scores[cat] = Math.random();
  }
  return scores;
}

/**
 * Analyze all frames and find best scenes
 */
async function analyzeVideo(videoPath, settings) {
  const aiSettings = settings.ai_scene_detection;
  
  if (!aiSettings.enabled || aiSettings.provider === 'disabled') {
    return { scenes: [], highlights: [] };
  }
  
  const tempDir = path.join(path.dirname(videoPath), '.ai_analysis');
  await fs.ensureDir(tempDir);
  
  try {
    // Extract frames
    console.log('[AI Scene] Extracting frames from:', path.basename(videoPath));
    const frames = await extractFrames(videoPath, tempDir, aiSettings.extract_frame_interval_sec);
    
    if (frames.length === 0) {
      console.warn('[AI Scene] No frames extracted');
      return { scenes: [], highlights: [] };
    }
    
    // Analyze each frame
    const scenes = [];
    for (let i = 0; i < frames.length; i++) {
      const framePath = frames[i];
      const timestamp = i * aiSettings.extract_frame_interval_sec;
      
      console.log(`[AI Scene] Analyzing frame ${i + 1}/${frames.length}...`);
      
      let scores;
      if (aiSettings.provider === 'openai' && aiSettings.openai_api_key) {
        scores = await analyzeFrameOpenAI(
          framePath, 
          aiSettings.openai_api_key, 
          aiSettings.detect_categories
        );
      } else {
        scores = await analyzeFrameLocal(framePath, aiSettings.detect_categories);
      }
      
      if (scores) {
        // Calculate max score across all categories
        const maxScore = Math.max(...Object.values(scores));
        
        // If above threshold, mark as interesting scene
        if (maxScore >= aiSettings.scene_threshold) {
          scenes.push({
            timestamp,
            scores,
            maxScore,
            frame: framePath,
            categories: Object.entries(scores)
              .filter(([_, score]) => score >= aiSettings.scene_threshold)
              .map(([cat]) => cat)
          });
        }
      }
    }
    
    console.log(`[AI Scene] Found ${scenes.length} interesting scenes`);
    
    // Group nearby scenes into highlight clips
    const highlights = [];
    if (aiSettings.auto_generate_highlights && scenes.length > 0) {
      let currentClip = null;
      
      for (const scene of scenes) {
        if (!currentClip) {
          currentClip = {
            startTime: scene.timestamp,
            endTime: scene.timestamp + aiSettings.min_scene_duration_sec,
            scenes: [scene],
            avgScore: scene.maxScore
          };
        } else {
          // If scene is close to current clip, extend it
          const gap = scene.timestamp - currentClip.endTime;
          if (gap < aiSettings.min_scene_duration_sec * 2) {
            currentClip.endTime = scene.timestamp + aiSettings.min_scene_duration_sec;
            currentClip.scenes.push(scene);
            currentClip.avgScore = (currentClip.avgScore + scene.maxScore) / 2;
          } else {
            // Save current clip and start new one
            if (currentClip.endTime - currentClip.startTime >= aiSettings.min_scene_duration_sec) {
              highlights.push(currentClip);
            }
            currentClip = {
              startTime: scene.timestamp,
              endTime: scene.timestamp + aiSettings.min_scene_duration_sec,
              scenes: [scene],
              avgScore: scene.maxScore
            };
          }
        }
        
        // Cap highlight duration
        if (currentClip && currentClip.endTime - currentClip.startTime >= aiSettings.max_highlight_duration_sec) {
          highlights.push(currentClip);
          currentClip = null;
        }
      }
      
      // Save last clip
      if (currentClip && currentClip.endTime - currentClip.startTime >= aiSettings.min_scene_duration_sec) {
        highlights.push(currentClip);
      }
    }
    
    console.log(`[AI Scene] Generated ${highlights.length} highlight clips`);
    
    // Clean up temp frames
    await fs.remove(tempDir);
    
    return { scenes, highlights };
  } catch (err) {
    console.error('[AI Scene] Analysis failed:', err.message);
    await fs.remove(tempDir).catch(() => {});
    return { scenes: [], highlights: [] };
  }
}

/**
 * Create highlight reel from clips
 */
async function createHighlightReel(videoPath, highlights, outputPath) {
  if (highlights.length === 0) {
    console.log('[AI Scene] No highlights to create');
    return null;
  }
  
  try {
    // Create filter file for ffmpeg
    const filterFile = outputPath + '.filter.txt';
    const segments = [];
    
    highlights.forEach((clip, idx) => {
      segments.push(`between(t,${clip.startTime},${clip.endTime})`);
    });
    
    const filterExpr = segments.join('+');
    
    // Use ffmpeg to extract highlight segments
    const cmd = `ffmpeg -i "${videoPath}" -vf "select='${filterExpr}',setpts=N/FRAME_RATE/TB" -af "aselect='${filterExpr}',asetpts=N/SR/TB" "${outputPath}" -y`;
    
    execSync(cmd, { stdio: 'pipe' });
    
    console.log('[AI Scene] Highlight reel created:', outputPath);
    return outputPath;
  } catch (err) {
    console.error('[AI Scene] Highlight creation failed:', err.message);
    return null;
  }
}

module.exports = {
  extractFrames,
  analyzeVideo,
  createHighlightReel
};
