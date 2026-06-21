import { Request, Response } from "express";
import { getDb } from "./db";
import { scheduleItems } from "../drizzle/schema";
import { sql } from "drizzle-orm";

const FB_PAGE_ID = process.env.FB_PAGE_ID || "";
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";
const SERPER_KEY = process.env.SerperAPIKeys || "";

async function postToFacebook(message: string, link?: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!FB_PAGE_ID || !FB_PAGE_ACCESS_TOKEN) {
    return { success: false, error: "Facebook credentials not configured" };
  }

  const body: Record<string, string> = { message, access_token: FB_PAGE_ACCESS_TOKEN };
  if (link) body.link = link;

  const res = await fetch(`https://graph.facebook.com/v25.0/${FB_PAGE_ID}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (data.error) return { success: false, error: data.error.message };
  return { success: true, postId: data.id };
}

async function getTodaysShows(): Promise<{ title: string }[]> {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const endWindow = now + 8 * 60 * 60 * 1000;
  try {
    const rows = await db
      .select({ title: scheduleItems.title })
      .from(scheduleItems)
      .where(sql`${scheduleItems.startTime} >= ${now} AND ${scheduleItems.startTime} <= ${endWindow}`)
      .limit(6);
    return rows;
  } catch {
    return [];
  }
}

async function fetchTrendingTopic(): Promise<{ headline: string } | null> {
  if (!SERPER_KEY) return null;
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: "Black entertainment celebrity news today", num: 5 }),
    });
    const data = (await res.json()) as { news?: { title: string; date?: string }[] };
    const articles = data.news || [];
    const recent = articles.find((a) => {
      const d = a.date || "";
      return d.includes("hour") || d.includes("day") || d.includes("min");
    });
    if (recent) return { headline: recent.title };
    return articles[0] ? { headline: articles[0].title } : null;
  } catch {
    return null;
  }
}

const isFriday = () => new Date().getDay() === 5;

// POST /api/scheduled/fb-morning-post
export async function fbMorningPostHandler(_req: Request, res: Response) {
  try {
    const shows = await getTodaysShows();
    const showLines = shows.length > 0
      ? shows.slice(0, 4).map((s) => `▶️ ${s.title}`).join("\n")
      : "▶️ Morning with Zara\n▶️ The Nia Lux Show\n▶️ CommunityCut Weekly\n▶️ Eliances Grand Table";

    const message = `🌅 Good morning! ZTVLIVE is LIVE right now — streaming FREE 24/7.

Today's lineup includes:
${showLines}

🎙️ Real shows. Real creators. Real culture.
📺 Watch free at ztvlivestream.com — no subscription required.

#ZTVLIVE #BlackEntertainment #FreeStreaming #LiveTV #BlackExcellence`;

    const result = await postToFacebook(message, "https://ztvlivestream.com");
    console.log("[FB Morning Post]", result.success ? `Posted: ${result.postId}` : `Error: ${result.error}`);
    res.json({ success: result.success, postId: result.postId, error: result.error });
  } catch (err) {
    console.error("[FB Morning Post] Error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

// POST /api/scheduled/fb-afternoon-post
export async function fbAfternoonPostHandler(_req: Request, res: Response) {
  try {
    let message: string;

    if (isFriday()) {
      message = `🎙️ It's Friday — that means The Rundown w/ Zoe is HERE!

Your weekly culture briefing covering everything that mattered this week:
🏆 Sports highlights
🎵 Music moments
🎬 Entertainment news
🌍 Community stories

Watch The Rundown w/ Zoe NOW at ztvlivestream.com 👇

#TheRundown #ZTVLIVE #ZoeZTVLIVE #BlackCulture #WeeklyRecap #BlackEntertainment`;
    } else {
      const topic = await fetchTrendingTopic();
      if (topic) {
        message = `📰 Trending right now: ${topic.headline}

The conversation is happening — and ZTVLIVE is where Black culture comes to watch, discuss, and celebrate.

🎙️ Original shows. Real creators. 24/7 free streaming.
📺 ztvlivestream.com

#ZTVLIVE #BlackEntertainment #Trending #BlackCulture #StreamingNow`;
      } else {
        message = `📺 ZTVLIVE is streaming 24/7 — and it's completely FREE.

From original shows to live events, we're building the streaming platform Black culture deserves.

🎙️ Zara • Nia Lux • Zoe • Matthew Brown • Eliances
Watch now → ztvlivestream.com

#ZTVLIVE #BlackExcellence #FreeStreaming #BlackEntertainment #LiveTV`;
      }
    }

    const result = await postToFacebook(message, "https://ztvlivestream.com");
    console.log("[FB Afternoon Post]", result.success ? `Posted: ${result.postId}` : `Error: ${result.error}`);
    res.json({ success: result.success, postId: result.postId, error: result.error });
  } catch (err) {
    console.error("[FB Afternoon Post] Error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
