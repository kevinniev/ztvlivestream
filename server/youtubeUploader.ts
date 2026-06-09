/**
 * ZTVLIVE YouTube Auto-Uploader
 * 
 * Uploads rendered HeyGen videos to the ZTVLIVE YouTube channel.
 * 
 * Strategy: Since YouTube Data API v3 requires OAuth2 with user consent,
 * and we're running in a server context, we use a stored refresh token
 * approach. The YOUTUBE_REFRESH_TOKEN env var must be set by the owner.
 * 
 * For Zara Daily: Upload as YouTube Short (portrait 9:16, #Shorts in title)
 * For Zoe Weekly: Upload as regular video (landscape 16:9)
 * 
 * Also updates the ZTVLIVE website database with the new video entry.
 */

import { getDb } from "./db";
import { videos } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

export interface YouTubeUploadResult {
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  publishedAt: string;
}

export interface YouTubeUploadOptions {
  videoUrl: string;           // HeyGen rendered video URL
  title: string;              // Video title
  description: string;        // Video description
  tags: string[];             // Video tags
  isShort: boolean;           // True for Zara Daily (portrait), false for Zoe Weekly
  thumbnailUrl?: string;      // Optional thumbnail from HeyGen
  categoryId?: string;        // YouTube category (24 = Entertainment)
  madeForKids?: boolean;
}

/**
 * Get YouTube OAuth2 access token from refresh token
 */
async function getYouTubeAccessToken(): Promise<string> {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "YouTube credentials not configured. Need: YOUTUBE_REFRESH_TOKEN, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET"
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(`YouTube token refresh failed (${response.status}): ${error}`);
  }

  const data = await response.json() as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`YouTube token refresh returned no access_token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Download a video from a URL and return as Buffer
 */
async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log(`[YouTube] Downloading video from: ${videoUrl}`);
  
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video (${response.status}): ${videoUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload a video to YouTube using the Data API v3 (resumable upload)
 */
export async function uploadToYouTube(options: YouTubeUploadOptions): Promise<YouTubeUploadResult> {
  const { videoUrl, title, description, tags, isShort, thumbnailUrl, categoryId = "24" } = options;

  console.log(`[YouTube] Starting upload: "${title}"`);

  // Get access token
  const accessToken = await getYouTubeAccessToken();

  // Download the video
  const videoBuffer = await downloadVideo(videoUrl);
  console.log(`[YouTube] Video downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`);

  // Add #Shorts to description and title for Shorts
  const finalTitle = isShort && !title.includes("#Shorts")
    ? `${title} #Shorts`
    : title;
  const finalDescription = isShort
    ? `${description}\n\n#Shorts #ZTVLive #BlackEntertainment #ZaraDailyNews`
    : `${description}\n\n#ZTVLive #BlackEntertainment #ZoeWeekly #TheRundown`;

  // Step 1: Initialize resumable upload
  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": videoBuffer.length.toString(),
      },
      body: JSON.stringify({
        snippet: {
          title: finalTitle.substring(0, 100),
          description: finalDescription.substring(0, 5000),
          tags: tags.slice(0, 500),
          categoryId,
          defaultLanguage: "en",
          defaultAudioLanguage: "en",
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: options.madeForKids ?? false,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.text().catch(() => "");
    throw new Error(`YouTube upload init failed (${initResponse.status}): ${error}`);
  }

  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("YouTube did not return upload URL");
  }

  console.log(`[YouTube] Upload URL obtained, uploading ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB...`);

  // Step 2: Upload the video bytes
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoBuffer.length.toString(),
    },
    body: videoBuffer as unknown as BodyInit,
  });

  if (!uploadResponse.ok && uploadResponse.status !== 308) {
    const error = await uploadResponse.text().catch(() => "");
    throw new Error(`YouTube video upload failed (${uploadResponse.status}): ${error}`);
  }

  const uploadResult = await uploadResponse.json() as {
    id?: string;
    snippet?: { title?: string; publishedAt?: string; thumbnails?: { high?: { url?: string } } };
    error?: { message?: string };
  };

  if (uploadResult.error?.message) {
    throw new Error(`YouTube upload error: ${uploadResult.error.message}`);
  }

  const youtubeVideoId = uploadResult.id;
  if (!youtubeVideoId) {
    throw new Error("YouTube did not return video ID after upload");
  }

  const youtubeUrl = `https://www.youtube.com/${isShort ? "shorts/" : "watch?v="}${youtubeVideoId}`;
  const finalThumbnailUrl = thumbnailUrl || 
    uploadResult.snippet?.thumbnails?.high?.url ||
    `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;

  console.log(`[YouTube] Upload complete: ${youtubeUrl}`);

  return {
    videoId: youtubeVideoId,
    videoUrl: youtubeUrl,
    thumbnailUrl: finalThumbnailUrl,
    title: finalTitle,
    publishedAt: uploadResult.snippet?.publishedAt || new Date().toISOString(),
  };
}

/**
 * Add the newly uploaded video to the ZTVLIVE website database
 */
export async function addVideoToDatabase(
  youtubeResult: YouTubeUploadResult,
  options: {
    description: string;
    tags: string[];
    category: "news" | "music" | "other" | "live" | "tech" | "gaming" | "sports" | "movies" | "podcasts";
    creatorName: string;
    duration: string;
    isFeatured?: boolean;
  }
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(videos).values({
    youtubeId: youtubeResult.videoId,
    // Note: youtubeId is the correct field name in schema
    title: youtubeResult.title,
    description: options.description,
    thumbnailUrl: youtubeResult.thumbnailUrl,
    category: options.category,
    tags: options.tags.join(", "),
    viewCount: 0,
    duration: options.duration,
    creatorName: options.creatorName,
    isFeatured: options.isFeatured ?? false,
    isLive: false,
    publishedAt: new Date(youtubeResult.publishedAt),
  });

  const videoId = (inserted as any).insertId as number;
  console.log(`[YouTube] Added to ZTVLIVE database: videoId=${videoId}`);
  return videoId;
}

/**
 * Notify the owner about a successful video publication
 */
export async function notifyVideoPublished(
  youtubeResult: YouTubeUploadResult,
  showName: string
): Promise<void> {
  try {
    await notifyOwner({
      title: `✅ ${showName} Published`,
      content: `New episode published to YouTube:\n\nTitle: ${youtubeResult.title}\nURL: ${youtubeResult.videoUrl}\nPublished: ${youtubeResult.publishedAt}`,
    });
  } catch (err) {
    console.warn("[YouTube] Failed to send owner notification:", err);
  }
}
