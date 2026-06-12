/**
 * POST /api/scheduled/nia-episode
 *
 * Receives a new CommunityCut Weekly / Nia full episode from the Thursday AGENT cron
 * and upserts it into the videos table.
 *
 * The AGENT cron searches YouTube for the latest episode, extracts the video ID,
 * title, description, and thumbnail, then POSTs here.
 *
 * Auth: sdk.authenticateRequest — user.isCron must be true.
 * Idempotent: upserts on youtubeId so re-runs are safe.
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { videos } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

export interface NiaEpisodePayload {
  youtubeId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: string;
  episodeNumber?: number;
  tags?: string;
}

export async function niaEpisodeHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log(`[NiaEpisode] Triggered at ${new Date().toISOString()} by task ${user.taskUid}`);

    const payload = req.body as NiaEpisodePayload;

    if (!payload?.youtubeId || !payload?.title) {
      return res.status(400).json({
        error: "Missing required fields: youtubeId and title are required",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    // Check if this episode already exists (idempotent)
    const existing = await db
      .select({ id: videos.id, title: videos.title })
      .from(videos)
      .where(eq(videos.youtubeId, payload.youtubeId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[NiaEpisode] Episode ${payload.youtubeId} already exists (id=${existing[0].id}), skipping.`);
      return res.json({
        ok: true,
        action: "skipped",
        reason: "already_exists",
        videoId: existing[0].id,
        title: existing[0].title,
      });
    }

    // Build tags — merge provided tags with default show tags
    const baseTags = "CommunityCut,Nia,full episode,weekly show,beauty,grooming";
    const allTags = payload.tags
      ? `${baseTags},${payload.tags}`
      : baseTags;

    // Insert the new episode
    const thumbnailUrl =
      payload.thumbnailUrl ||
      `https://img.youtube.com/vi/${payload.youtubeId}/maxresdefault.jpg`;

    const description =
      payload.description ||
      `The latest full episode of CommunityCut Weekly with Nia. Watch now on ZTVLIVE.`;

    await db.insert(videos).values({
      youtubeId: payload.youtubeId,
      title: payload.title,
      description,
      thumbnailUrl,
      category: "other",
      tags: allTags,
      duration: payload.duration ?? null,
      creatorName: "Nia — CommunityCut Weekly",
      isFeatured: true,
      isLive: false,
      publishedAt: new Date(),
    });

    // Fetch the inserted row to get the auto-incremented ID
    const [inserted] = await db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.youtubeId, payload.youtubeId))
      .limit(1);

    console.log(`[NiaEpisode] Published new episode: "${payload.title}" (id=${inserted?.id})`);

    // Notify the owner
    await notifyOwner({
      title: "🎬 New Nia Episode Published",
      content: `**${payload.title}** has been automatically published to ZTVLIVE.\n\nYouTube ID: ${payload.youtubeId}\nVideo ID: ${inserted?.id}\nPublished: ${new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" })} MST`,
    });

    return res.json({
      ok: true,
      action: "published",
      videoId: inserted?.id,
      youtubeId: payload.youtubeId,
      title: payload.title,
    });
  } catch (err: any) {
    console.error("[NiaEpisode] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
