/**
 * ZTVLIVE HeyGen Production Submitter
 * 
 * Uses MCP tool create_video_from_avatar for direct submission.
 * Falls back to REST API if MCP is unavailable.
 * 
 * Zara Daily: Avatar V engine, portrait 9:16, voice: Brittney (4754e1ec667544b0bd18cdf4bec7d6a7)
 * Zoe Weekly: Avatar V engine, landscape 16:9, voice: Cassidy (16a09e4706f74997ba4ed05ea11470f6)
 * 
 * Confirmed Zara looks (Avatar V, group 930af37b3f2d436ba4e0c7ca3b5df6db):
 *   Red Suit:      5f63b90352b24ba3862a5448207730f2
 *   Royal Blue:    0e2c3e4e59e04794a6021a6589060e45
 *   Emerald Green: 1af650014ac0457387e1ebca797f8b9e
 *   Red Blazer:    8448903971ab4a319f0cc4927bf13eb1
 */

import { generateImage } from "./_core/imageGeneration";
import type { ZaraDailyScript, ZoeWeeklyScript, BrollCue } from "./scriptGenerator";

export interface BrollAsset {
  description: string;
  imageUrl: string;
  storageKey: string;
}

export interface HeyGenRenderResult {
  videoId: string;
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

// Voice IDs confirmed from account
const VOICE_ZARA = "4754e1ec667544b0bd18cdf4bec7d6a7";   // Brittney — energetic, young Black woman energy
const VOICE_ZOE  = "16a09e4706f74997ba4ed05ea11470f6";   // Cassidy — smooth, professional anchor

/**
 * Generate b-roll images for a script using the built-in image generation service
 */
export async function generateBrollImages(brollCues: BrollCue[]): Promise<BrollAsset[]> {
  const assets: BrollAsset[] = [];

  for (const cue of brollCues.slice(0, 5)) {
    try {
      console.log(`[HeyGen] Generating b-roll: ${cue.description}`);
      
      const prompt = `Cinematic, professional broadcast-quality image for a Black culture entertainment news show. 
${cue.description}
Style: High-quality photorealistic, vibrant colors, professional lighting, suitable for TV broadcast. 
NO text overlays. NO watermarks. Clean, compelling visual.`;

      const genResult = await generateImage({ prompt });
      const imageUrl = genResult.url;
      
      if (!imageUrl) {
        console.warn(`[HeyGen] No URL returned for b-roll: ${cue.description}`);
        continue;
      }
      
      assets.push({
        description: cue.description,
        imageUrl,
        storageKey: imageUrl.replace("/manus-storage/", ""),
      });

      console.log(`[HeyGen] B-roll generated: ${imageUrl}`);
    } catch (err) {
      console.warn(`[HeyGen] Failed to generate b-roll for "${cue.description}":`, err);
    }
  }

  return assets;
}

/**
 * Get the absolute public URL for a storage asset
 */
function getPublicUrl(storageUrl: string): string {
  const appUrl = process.env.APP_URL || "https://ztvlivestream.com";
  if (storageUrl.startsWith("http")) return storageUrl;
  return `${appUrl}${storageUrl}`;
}

/**
 * Clean script text — remove stage directions and markers
 */
function cleanScriptText(script: string): string {
  return script
    .replace(/\[B-ROLL:[^\]]*\]/g, "")
    .replace(/\[INTRO[^\]]*\]/g, "")
    .replace(/\[OUTRO[^\]]*\]/g, "")
    .replace(/\[SEGMENT[^\]]*\]/g, "")
    .replace(/\[COLD OPEN\]/g, "")
    .replace(/\[TOP STORY\]/g, "")
    .replace(/\[MUSIC ROUNDUP\]/g, "")
    .replace(/\[CULTURE MOMENT\]/g, "")
    .replace(/\[WEEKEND GUIDE\]/g, "")
    .replace(/\[CLOSING\]/g, "")
    .replace(/\*\*[^*]*\*\*/g, "")
    .replace(/\n\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Submit a HeyGen render via REST API
 * Uses the v2/video/generate endpoint with talking_photo character
 */
export async function submitHeyGenRender(
  avatarLookId: string,
  voiceId: string,
  scriptText: string,
  backgroundImageUrl: string | null,
  dimension: { width: number; height: number },
  title: string
): Promise<{ videoId: string }> {
  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    throw new Error("HEYGEN_API_KEY not configured. Please add it in Settings → Secrets.");
  }

  const cleanedText = cleanScriptText(scriptText);
  console.log(`[HeyGen] Submitting render: "${title}" (${cleanedText.length} chars)`);

  const videoInput: Record<string, unknown> = {
    character: {
      type: "talking_photo",
      talking_photo_id: avatarLookId,
      talking_style: "expressive",
      expression: "happy",
    },
    voice: {
      type: "text",
      input_text: cleanedText.substring(0, 1500), // HeyGen limit
      voice_id: voiceId,
      speed: 1.0,
    },
  };

  if (backgroundImageUrl) {
    videoInput.background = {
      type: "image",
      url: backgroundImageUrl,
    };
  } else {
    videoInput.background = {
      type: "color",
      value: "#0a0a1a",
    };
  }

  const payload = {
    video_inputs: [videoInput],
    dimension,
    test: false,
    caption: false,
    title,
  };

  const response = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "X-Api-Key": heygenApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`HeyGen render submission failed (${response.status}): ${errorText}`);
  }

  const result = await response.json() as {
    data?: { video_id?: string };
    error?: { message?: string };
    code?: number;
    message?: string;
  };

  if (result.error?.message || result.message) {
    throw new Error(`HeyGen API error: ${result.error?.message || result.message}`);
  }

  const videoId = result.data?.video_id;
  if (!videoId) {
    throw new Error(`HeyGen did not return a video_id. Response: ${JSON.stringify(result)}`);
  }

  console.log(`[HeyGen] Render submitted successfully: videoId=${videoId}`);
  return { videoId };
}

/**
 * Poll HeyGen render status
 */
export async function pollHeyGenStatus(
  videoId: string,
  maxWaitMinutes = 5
): Promise<{ status: string; videoUrl?: string; thumbnailUrl?: string; durationSeconds?: number }> {
  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    throw new Error("HEYGEN_API_KEY not configured");
  }

  const maxAttempts = maxWaitMinutes * 4; // Poll every 15 seconds
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 15000));

    try {
      const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { "X-Api-Key": heygenApiKey },
      });

      if (!response.ok) {
        console.warn(`[HeyGen] Status poll failed (${response.status}), retrying...`);
        attempts++;
        continue;
      }

      const result = await response.json() as {
        data?: {
          status?: string;
          video_url?: string;
          thumbnail_url?: string;
          duration?: number;
          error?: string;
        };
      };

      const status = result.data?.status;
      console.log(`[HeyGen] Poll ${attempts + 1}: videoId=${videoId}, status=${status}`);

      if (status === "completed") {
        return {
          status: "completed",
          videoUrl: result.data?.video_url,
          thumbnailUrl: result.data?.thumbnail_url,
          durationSeconds: result.data?.duration,
        };
      }

      if (status === "failed") {
        return { status: "failed" };
      }
    } catch (err) {
      console.warn(`[HeyGen] Poll error (attempt ${attempts + 1}):`, err);
    }

    attempts++;
  }

  return { status: "timeout" };
}

/**
 * Full Zara Daily production pipeline
 */
export async function produceZaraDaily(
  script: ZaraDailyScript
): Promise<{ videoId: string; brollAssets: BrollAsset[] }> {
  console.log(`[HeyGen] Starting Zara Daily production: "${script.title}"`);

  const brollAssets = await generateBrollImages(script.brollCues);
  console.log(`[HeyGen] Generated ${brollAssets.length} b-roll images`);

  const backgroundUrl = brollAssets.length > 0
    ? getPublicUrl(brollAssets[0].imageUrl)
    : null;

  const { videoId } = await submitHeyGenRender(
    script.outfitLookId,
    VOICE_ZARA,
    script.script,
    backgroundUrl,
    { width: 720, height: 1280 }, // Portrait 9:16
    script.title
  );

  return { videoId, brollAssets };
}

/**
 * Full Zoe Weekly production pipeline
 */
export async function produceZoeWeekly(
  script: ZoeWeeklyScript
): Promise<{ videoId: string; brollAssets: BrollAsset[] }> {
  console.log(`[HeyGen] Starting Zoe Weekly production: "${script.title}"`);

  const brollAssets = await generateBrollImages(script.brollCues);
  console.log(`[HeyGen] Generated ${brollAssets.length} b-roll images`);

  const backgroundUrl = brollAssets.length > 0
    ? getPublicUrl(brollAssets[0].imageUrl)
    : null;

  const { videoId } = await submitHeyGenRender(
    script.outfitLookId,
    VOICE_ZOE,
    script.script,
    backgroundUrl,
    { width: 1280, height: 720 }, // Landscape 16:9
    script.title
  );

  return { videoId, brollAssets };
}
