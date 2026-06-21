/**
 * Automated X/Twitter posting handlers for ZTVLIVE.
 * 
 * Schedule: 2 posts per day max
 *   POST 1 — 9am MST (16:00 UTC): Daily morning programming lineup
 *   POST 2 — 4pm MST (23:00 UTC): Trending topic Mon–Thu | Zoe Friday recap
 *
 * Both are Heartbeat cron jobs (no agent needed — all logic is inline).
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { postTweet } from "./twitterClient";
import { getDb } from "./db";
import { scheduleItems } from "../drizzle/schema";
import { gte, lte, and, desc } from "drizzle-orm";

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchTrendingTopic(): Promise<{ title: string; snippet: string } | null> {
  if (!ENV.serperApiKey) return null;
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "X-API-KEY": ENV.serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: "Black entertainment celebrity news today", num: 3 }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { news?: Array<{ title: string; snippet: string }> };
    const first = data.news?.[0];
    return first ? { title: first.title, snippet: first.snippet } : null;
  } catch {
    return null;
  }
}

/** Get today's schedule slots (next 16 hours from now) */
async function getTodaysShows(): Promise<Array<{ title: string; category: string | null }>> {
  const now = Date.now();
  const end = now + 16 * 60 * 60 * 1000;
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ title: scheduleItems.title, category: scheduleItems.category })
    .from(scheduleItems)
    .where(and(gte(scheduleItems.startTime, now), lte(scheduleItems.startTime, end)))
    .orderBy(scheduleItems.startTime)
    .limit(8);
  return rows;
}

/** Pick 4 distinct show names for the lineup tweet */
function pickShows(shows: Array<{ title: string; category: string | null }>): string[] {
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const s of shows) {
    const name = s.title.split(":")[0].trim(); // strip episode subtitle
    if (!seen.has(name) && picked.length < 4) {
      seen.add(name);
      picked.push(name);
    }
  }
  return picked;
}

// ─── POST 1: Morning lineup — 9am MST (16:00 UTC) daily ─────────────────────

export async function xMorningLineupHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });

    const shows = await getTodaysShows();
    const lineup = pickShows(shows);

    const showLines =
      lineup.length > 0
        ? lineup.map((s) => `▶ ${s}`).join("\n")
        : "▶ Morning with Zara\n▶ The Nia Lux Show\n▶ CommunityCut Weekly\n▶ Million Dollar Mingle";

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "America/Phoenix",
    });

    const text =
      `📺 ZTVLIVE is LIVE — ${today}\n\n` +
      `Today's programming:\n${showLines}\n\n` +
      `Watch free, no subscription needed 👇\nztvlivestream.com\n\n` +
      `#ZTVLIVE #BlackEntertainment #StreamingNow #LiveTV`;

    const tweet = await postTweet(text);
    console.log(`[X Morning] Posted tweet ${tweet.id}`);
    return res.json({ ok: true, tweetId: tweet.id });
  } catch (err: any) {
    console.error("[X Morning] Error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── POST 2: Afternoon trending / Friday Zoe recap — 4pm MST (23:00 UTC) ───

export async function xAfternoonPostHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });

    const dayOfWeek = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "America/Phoenix",
    });
    const isFriday = dayOfWeek === "Friday";

    let text: string;

    if (isFriday) {
      // Friday: Zoe's weekly recap announcement
      // Find the most recent Zoe episode in the schedule
      const db2 = await getDb();
      if (!db2) throw new Error("DB unavailable");
      const zoeSlot = await db2
        .select({ title: scheduleItems.title, youtubeId: scheduleItems.youtubeId })
        .from(scheduleItems)
        .where(gte(scheduleItems.startTime, Date.now() - 7 * 24 * 60 * 60 * 1000))
        .orderBy(desc(scheduleItems.startTime))
        .limit(50);

      const zoeEp = zoeSlot.find(
        (s: { title: string; youtubeId: string | null }) => s.title.toLowerCase().includes("zoe") || s.title.toLowerCase().includes("rundown")
      );

      const episodeRef = zoeEp
        ? `"${zoeEp.title}"`
        : "The Rundown w/ Zoe — this week's recap";

      text =
        `🎬 It's Friday and The Rundown w/ Zoe is here!\n\n` +
        `${episodeRef}\n\n` +
        `Zoe breaks down the week's biggest stories in culture, entertainment & business.\n\n` +
        `Watch now → ztvlivestream.com\n\n` +
        `#TheRundown #ZTVLIVE #FridayVibes #BlackEntertainment #WeeklyRecap`;
    } else {
      // Mon–Thu: trending topic post
      const trending = await fetchTrendingTopic();

      if (trending) {
        // Keep snippet short — 80 chars max
        const snippet =
          trending.snippet.length > 80
            ? trending.snippet.slice(0, 77) + "..."
            : trending.snippet;

        text =
          `🔥 Trending: ${trending.title}\n\n` +
          `${snippet}\n\n` +
          `Get the full story + more culture coverage on ZTVLIVE 👇\n` +
          `ztvlivestream.com\n\n` +
          `#ZTVLIVE #BlackEntertainment #Trending #CultureNews`;
      } else {
        // Fallback if Serper is unavailable
        text =
          `🌍 The world is watching — and ZTVLIVE is covering it all.\n\n` +
          `Real shows. Real creators. Real culture.\n\n` +
          `Stream free → ztvlivestream.com\n\n` +
          `#ZTVLIVE #BlackExcellence #StreamingNow`;
      }
    }

    const tweet = await postTweet(text);
    console.log(`[X Afternoon] Posted ${isFriday ? "Zoe recap" : "trending"} tweet ${tweet.id}`);
    return res.json({ ok: true, tweetId: tweet.id, type: isFriday ? "zoe-recap" : "trending" });
  } catch (err: any) {
    console.error("[X Afternoon] Error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
