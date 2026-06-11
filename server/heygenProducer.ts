/**
 * ZTVLIVE HeyGen Production Submitter
 *
 * Uses HeyGen Video Agent (v3/video-agents) for full-body avatar videos
 * with b-roll, camera movement, and broadcast quality — matching the
 * approved June 7 "The Rundown w/ Zoe" production style.
 *
 * Zara Daily: Avatar V engine, portrait 9:16, voice: Brittney (4754e1ec667544b0bd18cdf4bec7d6a7)
 * Zoe Weekly: Avatar IV engine, landscape 16:9, voice: Cassidy (16a09e4706f74997ba4ed05ea11470f6)
 *
 * Confirmed Zara looks (Avatar V, group 930af37b3f2d436ba4e0c7ca3b5df6db):
 *   Red Suit:      5f63b90352b24ba3862a5448207730f2
 *   Royal Blue:    0e2c3e4e59e04794a6021a6589060e45
 *   Emerald Green: 1af650014ac0457387e1ebca797f8b9e
 *   Red Blazer:    8448903971ab4a319f0cc4927bf13eb1
 *   ZTVLIVE V3:    66732d2ef2fe4fd4ada6a091e321b847
 *
 * Confirmed Zoe looks (Avatar IV, group 0e53bcf9428e468f83abd2620b028524):
 *   15b69dc9e9bd487baa0b1c3e22692724 (Wednesday approved look)
 *   275ddb348c4a4c99bd168ecf23f0b6f3
 *   a81097e4c05c4a0584486bde97fd4067
 *   aa9192c6b0b54bd3813cddec8099b56c
 *   f42a3a8700214864a77fced28883ede2
 *   f8097a8934a34bd0b610505dcd8ef70e
 *   ad096bf45f6d42bbb6d7a14d3889413e
 *   d970c946b5c04e4899655f4e16e36b9e
 *
 * ZTVLIVE Branded Backgrounds (CDN):
 *   Zara Newsdesk:    https://files.manuscdn.com/user_upload_by_module/session_file/310519663672855435/CwABJbmsKiclQIDt.png
 *   Zara Lounge:      https://files.manuscdn.com/user_upload_by_module/session_file/310519663672855435/zTTPgvdpDRuQLghZ.png
 *   Zoe Weekly Recap: https://files.manuscdn.com/user_upload_by_module/session_file/310519663672855435/uXXFxkEtmpvafnjs.png
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

// ZTVLIVE Branded Set Backgrounds (CDN — permanent URLs)
const ZTVLIVE_SETS = {
  zara_newsdesk:    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663672855435/CwABJbmsKiclQIDt.png",
  zara_lounge:      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663672855435/zTTPgvdpDRuQLghZ.png",
  zoe_weekly_recap: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663672855435/uXXFxkEtmpvafnjs.png",
};

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
 * Submit a HeyGen render via Video Agent API (v3/video-agents)
 * This produces full-body avatar videos with b-roll and broadcast quality,
 * matching the approved June 7 "The Rundown w/ Zoe" production style.
 */
export async function submitHeyGenRender(
  avatarLookId: string,
  voiceId: string,
  scriptText: string,
  backgroundImageUrl: string | null,
  dimension: { width: number; height: number },
  title: string,
  brollAssets: BrollAsset[] = []
): Promise<{ videoId: string }> {
  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    throw new Error("HEYGEN_API_KEY not configured. Please add it in Settings → Secrets.");
  }

  const cleanedText = cleanScriptText(scriptText);
  const orientation = dimension.width > dimension.height ? "landscape" : "portrait";
  const bgUrl = backgroundImageUrl || (orientation === "landscape" ? ZTVLIVE_SETS.zoe_weekly_recap : ZTVLIVE_SETS.zara_newsdesk);

  // Build b-roll context for the prompt
  const brollContext = brollAssets.length > 0
    ? `\n\nB-roll images to use:\n${brollAssets.map((a, i) => `${i + 1}. ${a.description}: ${getPublicUrl(a.imageUrl)}`).join("\n")}`
    : "";

  const prompt = `Create a professional broadcast video for ZTVLIVE — a premium Black entertainment streaming platform.

Avatar: Use avatar look ID ${avatarLookId}
Voice ID: ${voiceId}
Background: Use this ZTVLIVE branded set image as the background: ${bgUrl}
Orientation: ${orientation} (${dimension.width}x${dimension.height})

Script (spoken word only):
${cleanedText}
${brollContext}

Production style:
- Premium broadcast TV quality — smooth, steady camera movements
- Full-body avatar visible (not just talking head)
- Natural, expressive gestures and body language
- ZTVLIVE lower-third text overlay at the bottom
- Cinematic lighting on the set
- B-roll images should cut in at natural story transition points
- Energy: confident, warm, culturally fluent Black entertainment host
- Do NOT use the word "AI" anywhere in the video

Title: ${title}`;

  console.log(`[HeyGen] Submitting Video Agent render: "${title}" (${cleanedText.length} chars, ${orientation})`);

  const response = await fetch("https://api.heygen.com/v3/video-agents", {
    method: "POST",
    headers: {
      "X-Api-Key": heygenApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      mode: "generate",
      avatarId: avatarLookId,
      orientation,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`HeyGen Video Agent submission failed (${response.status}): ${errorText}`);
  }

  const result = await response.json() as {
    data?: { session_id?: string; video_id?: string };
    error?: { message?: string };
    code?: number;
    message?: string;
  };

  if (result.error?.message || result.message) {
    throw new Error(`HeyGen API error: ${result.error?.message || result.message}`);
  }

  // Video Agent returns session_id, not video_id directly
  const videoId = result.data?.session_id || result.data?.video_id;
  if (!videoId) {
    throw new Error(`HeyGen did not return a session_id. Response: ${JSON.stringify(result)}`);
  }

  console.log(`[HeyGen] Video Agent render submitted: sessionId=${videoId}`);
  return { videoId };
}

/**
 * Poll HeyGen Video Agent session status
 */
export async function pollHeyGenStatus(
  videoId: string,
  maxWaitMinutes = 30
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
      // Try Video Agent session endpoint first
      const sessionResponse = await fetch(`https://api.heygen.com/v3/video-agents/sessions/${videoId}`, {
        headers: { "X-Api-Key": heygenApiKey },
      });

      if (sessionResponse.ok) {
        const sessionResult = await sessionResponse.json() as {
          data?: {
            status?: string;
            video_id?: string;
            video_url?: string;
            thumbnail_url?: string;
            duration?: number;
          };
        };

        const status = sessionResult.data?.status;
        console.log(`[HeyGen] Poll ${attempts + 1}: sessionId=${videoId}, status=${status}`);

        if (status === "completed" || status === "success") {
          // If we have a video_id, fetch the actual video URL
          const actualVideoId = sessionResult.data?.video_id;
          if (actualVideoId && !sessionResult.data?.video_url) {
            const videoStatus = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${actualVideoId}`, {
              headers: { "X-Api-Key": heygenApiKey },
            });
            if (videoStatus.ok) {
              const vs = await videoStatus.json() as { data?: { video_url?: string; thumbnail_url?: string; duration?: number } };
              return {
                status: "completed",
                videoUrl: vs.data?.video_url,
                thumbnailUrl: vs.data?.thumbnail_url,
                durationSeconds: vs.data?.duration,
              };
            }
          }
          return {
            status: "completed",
            videoUrl: sessionResult.data?.video_url,
            thumbnailUrl: sessionResult.data?.thumbnail_url,
            durationSeconds: sessionResult.data?.duration,
          };
        }

        if (status === "failed" || status === "error") {
          return { status: "failed" };
        }
      } else {
        // Fallback: try legacy video status endpoint
        const legacyResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
          headers: { "X-Api-Key": heygenApiKey },
        });
        if (legacyResponse.ok) {
          const legacyResult = await legacyResponse.json() as {
            data?: { status?: string; video_url?: string; thumbnail_url?: string; duration?: number };
          };
          const status = legacyResult.data?.status;
          console.log(`[HeyGen] Legacy poll ${attempts + 1}: videoId=${videoId}, status=${status}`);
          if (status === "completed") {
            return {
              status: "completed",
              videoUrl: legacyResult.data?.video_url,
              thumbnailUrl: legacyResult.data?.thumbnail_url,
              durationSeconds: legacyResult.data?.duration,
            };
          }
          if (status === "failed") return { status: "failed" };
        }
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
 * Portrait 9:16, ZTVLIVE newsdesk or lounge background, Brittney voice
 */
export async function produceZaraDaily(
  script: ZaraDailyScript
): Promise<{ videoId: string; brollAssets: BrollAsset[] }> {
  console.log(`[HeyGen] Starting Zara Daily production: "${script.title}"`);

  const brollAssets = await generateBrollImages(script.brollCues);
  console.log(`[HeyGen] Generated ${brollAssets.length} b-roll images`);

  // Alternate between newsdesk and lounge backgrounds
  const dayOfMonth = new Date(script.date).getDate();
  const backgroundUrl = dayOfMonth % 2 === 0 ? ZTVLIVE_SETS.zara_newsdesk : ZTVLIVE_SETS.zara_lounge;

  const { videoId } = await submitHeyGenRender(
    script.outfitLookId,
    VOICE_ZARA,
    script.script,
    backgroundUrl,
    { width: 720, height: 1280 }, // Portrait 9:16
    script.title,
    brollAssets
  );

  return { videoId, brollAssets };
}

/**
 * Full Zoe Weekly production pipeline
 * Landscape 16:9, ZTVLIVE Weekly Recap background, Cassidy voice
 */
export async function produceZoeWeekly(
  script: ZoeWeeklyScript
): Promise<{ videoId: string; brollAssets: BrollAsset[] }> {
  console.log(`[HeyGen] Starting Zoe Weekly production: "${script.title}"`);

  const brollAssets = await generateBrollImages(script.brollCues);
  console.log(`[HeyGen] Generated ${brollAssets.length} b-roll images`);

  const { videoId } = await submitHeyGenRender(
    script.outfitLookId,
    VOICE_ZOE,
    script.script,
    ZTVLIVE_SETS.zoe_weekly_recap, // Always use the Zoe Weekly Recap set
    { width: 1280, height: 720 }, // Landscape 16:9
    script.title,
    brollAssets
  );

  return { videoId, brollAssets };
}
