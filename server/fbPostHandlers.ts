import { Request, Response } from "express";
import { getDb } from "./db";
import { scheduleItems, videos } from "../drizzle/schema";
import { sql, desc } from "drizzle-orm";

const FB_PAGE_ID = process.env.FB_PAGE_ID || "";
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";
const SERPER_KEY = process.env.SerperAPIKeys || "";
const FB_API_VERSION = "v25.0";

// ─── Core Facebook API helpers ───────────────────────────────────────────────

/** Post a plain text + optional link post (link card format — better than text-only) */
async function postToFacebook(
  message: string,
  link?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!FB_PAGE_ID || !FB_PAGE_ACCESS_TOKEN) {
    return { success: false, error: "Facebook credentials not configured" };
  }

  const body: Record<string, string> = {
    message,
    access_token: FB_PAGE_ACCESS_TOKEN,
  };
  if (link) body.link = link;

  const res = await fetch(
    `https://graph.facebook.com/${FB_API_VERSION}/${FB_PAGE_ID}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (data.error) return { success: false, error: data.error.message };
  return { success: true, postId: data.id };
}

/** Post a photo post with a URL-based image — gets 3-5x more reach than text-only */
async function postPhotoToFacebook(
  message: string,
  imageUrl: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!FB_PAGE_ID || !FB_PAGE_ACCESS_TOKEN) {
    return { success: false, error: "Facebook credentials not configured" };
  }

  const body = {
    caption: message,
    url: imageUrl,
    access_token: FB_PAGE_ACCESS_TOKEN,
  };

  const res = await fetch(
    `https://graph.facebook.com/${FB_API_VERSION}/${FB_PAGE_ID}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json()) as { id?: string; post_id?: string; error?: { message: string } };
  if (data.error) {
    // Fallback to text post if photo fails
    console.warn("[FB Photo Post] Photo failed, falling back to text post:", data.error.message);
    return postToFacebook(message, "https://ztvlivestream.com");
  }
  return { success: true, postId: data.post_id || data.id };
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function getTodaysShows(): Promise<
  { title: string; thumbnailUrl?: string | null; youtubeId?: string | null }[]
> {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const endWindow = now + 8 * 60 * 60 * 1000;
  try {
    const rows = await db
      .select({
        title: scheduleItems.title,
        thumbnailUrl: scheduleItems.thumbnailUrl,
        youtubeId: scheduleItems.youtubeId,
      })
      .from(scheduleItems)
      .where(
        sql`${scheduleItems.startTime} >= ${now} AND ${scheduleItems.startTime} <= ${endWindow}`
      )
      .limit(6);
    return rows;
  } catch {
    return [];
  }
}

async function getLatestVideo(): Promise<{
  title: string;
  thumbnailUrl?: string | null;
  youtubeId?: string | null;
} | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({
        title: videos.title,
        thumbnailUrl: videos.thumbnailUrl,
        youtubeId: videos.youtubeId,
      })
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(1);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function fetchTrendingTopic(): Promise<{
  headline: string;
  url?: string;
  imageUrl?: string;
} | null> {
  if (!SERPER_KEY) return null;
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        q: "Black entertainment celebrity music news today 2026",
        num: 10,
      }),
    });
    const data = (await res.json()) as {
      news?: { title: string; date?: string; link?: string; imageUrl?: string }[];
    };
    const articles = data.news || [];
    // Prefer very recent articles
    const recent = articles.find((a) => {
      const d = a.date || "";
      return d.includes("hour") || d.includes("min") || d.includes("1 day");
    });
    const pick = recent || articles[0];
    if (!pick) return null;
    return { headline: pick.title, url: pick.link, imageUrl: pick.imageUrl };
  } catch {
    return null;
  }
}

const isFriday = () => new Date().getDay() === 5;
const isSunday = () => new Date().getDay() === 0;

// ─── Viral engagement post templates ─────────────────────────────────────────

/** BET Awards 2026 hype post — runs June 21–28 */
function buildBETAwardsPost(): { message: string; imageUrl: string } {
  const options = [
    {
      message: `🏆 BET AWARDS 2026 — THIS SUNDAY JUNE 28 at 8PM!

The biggest night in Black culture is almost here and we need to know:

👇 WHO ARE YOU ROOTING FOR?

🎤 Cardi B — "Am I the Drama?"
🎤 J. Cole — "The Fall-Off"
🎤 Clipse — "Let God Sort Em Out"
🎤 Tyler, The Creator
🎤 Bruno Mars

Drop your Album of the Year pick in the comments! ⬇️

And performers include: Cardi B, Doechii, Queen Latifah, Kehlani, Tems, Lil Wayne, GloRilla, Rick Ross, T.I., Jill Scott — hosted by Druski! 🔥

ZTVLIVE is YOUR home for Black culture, entertainment, and community.
📺 Watch free 24/7 → ztvlivestream.com

#BETAwards2026 #BETAwards #CardiB #Doechii #BlackExcellence #ZTVLIVE #BlackEntertainment`,
      imageUrl:
        "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", // replaced below with real thumbnail
    },
    {
      message: `🔥 BET AWARDS 2026 — SUNDAY JUNE 28!

Druski is hosting. Cardi B is performing. Doechii is performing. Queen Latifah is performing.

This is going to be LEGENDARY. 🏆

Tell me in the comments:
💬 Who's winning Album of the Year?
💬 Who's giving the best performance?
💬 Who's showing OUT on the red carpet?

👇 Drop your predictions below — let's talk about it!

ZTVLIVE covers Black culture 24/7. Stream free at ztvlivestream.com 📺

#BETAwards2026 #Druski #CardiB #Doechii #QueenLatifah #BlackCulture #ZTVLIVE`,
      imageUrl: "",
    },
  ];

  // Pick based on day of week for variety
  const idx = new Date().getDate() % options.length;
  return options[idx];
}

/** Notification reminder post — asks followers to turn on page notifications */
function buildNotificationReminderPost(): string {
  return `📣 Are you seeing our posts?

With 11,000+ of you following ZTV Productions, we want to make sure you NEVER miss a show, a drop, or a live event.

Here's how to turn on notifications:
1️⃣ Visit our page (ZTV Productions)
2️⃣ Click the three dots "•••" near the Follow button
3️⃣ Select "Turn on notifications"
4️⃣ Choose "All posts" ✅

That's it! You'll get notified every time we go live, drop new content, or post something you need to see. 🔔

We're streaming FREE 24/7 at ztvlivestream.com — original shows, live events, Black culture, and community.

💬 Comment "NOTIFIED" below if you turned it on — we see every comment and we appreciate you! 🙏

#ZTVLIVE #BlackEntertainment #FreeStreaming #ZTVProductions #BlackCulture`;
}

/** Engagement question post — drives comments for algorithm boost */
function buildEngagementQuestionPost(topic: {
  headline: string;
  url?: string;
}): string {
  const questions = [
    `What's your take on this? 👇 Drop your thoughts in the comments!`,
    `💬 The community needs to weigh in on this. What do you think?`,
    `👇 Comment below — we want to hear from YOU!`,
    `Tag someone who needs to see this 👇`,
    `💬 Agree or disagree? Drop it in the comments!`,
  ];
  const q = questions[new Date().getHours() % questions.length];

  return `📰 ${topic.headline}

${q}

ZTVLIVE is where Black culture comes to watch, discuss, and celebrate — streaming FREE 24/7.
📺 ztvlivestream.com

#ZTVLIVE #BlackEntertainment #BlackCulture #Trending`;
}

/** Morning lineup post — photo format with thumbnail */
function buildMorningLineupPost(shows: { title: string }[]): string {
  const showLines =
    shows.length > 0
      ? shows
          .slice(0, 4)
          .map((s) => `▶️ ${s.title}`)
          .join("\n")
      : `▶️ Morning with Zara\n▶️ The Nia Lux Show\n▶️ CommunityCut Weekly\n▶️ Eliances Grand Table`;

  return `☀️ Good morning! ZTVLIVE is LIVE right now — streaming FREE 24/7.

Today's lineup:
${showLines}

🎙️ Real shows. Real creators. Real culture.
📺 Watch free → ztvlivestream.com

💬 What are you watching today? Drop it below! 👇

#ZTVLIVE #BlackEntertainment #FreeStreaming #LiveTV #BlackExcellence #GoodMorning`;
}

/** Friday Zoe Rundown post */
function buildFridayRundownPost(): string {
  return `🎙️ It's FRIDAY — The Rundown w/ Zoe is LIVE!

Your weekly culture briefing is here. Zoe breaks down everything that mattered this week:
🏆 Sports highlights
🎵 Music moments & new drops
🎬 Entertainment news
✂️ CommunityCut groomer shoutouts
🌍 Community stories

👇 What was YOUR biggest moment of the week? Drop it in the comments!

Watch The Rundown w/ Zoe NOW → ztvlivestream.com 📺

Tag a friend who needs their weekly culture fix! 👇

#TheRundown #ZTVLIVE #ZoeZTVLIVE #BlackCulture #WeeklyRecap #BlackEntertainment #Friday`;
}

// ─── Route handlers ────────────────────────────────────────────────────────────

// POST /api/scheduled/fb-morning-post
export async function fbMorningPostHandler(_req: Request, res: Response) {
  try {
    const shows = await getTodaysShows();
    const latestVideo = await getLatestVideo();

    // Check if BET Awards week (June 21–28, 2026)
    const now = new Date();
    const isBETWeek =
      now.getFullYear() === 2026 &&
      now.getMonth() === 5 && // June = month 5
      now.getDate() >= 21 &&
      now.getDate() <= 28;

    let result;

    if (isBETWeek) {
      // Use BET Awards viral post during awards week
      const betPost = buildBETAwardsPost();
      // Use the latest video thumbnail or a ZTVLIVE branded image
      const imageUrl =
        latestVideo?.thumbnailUrl ||
        "https://i.ytimg.com/vi/Ks-_Mh1QhMc/maxresdefault.jpg";
      result = await postPhotoToFacebook(betPost.message, imageUrl);
    } else {
      // Standard morning lineup — photo post with show thumbnail
      const message = buildMorningLineupPost(shows);
      const imageUrl =
        shows[0]?.thumbnailUrl ||
        latestVideo?.thumbnailUrl ||
        "https://i.ytimg.com/vi/Ks-_Mh1QhMc/maxresdefault.jpg";
      result = await postPhotoToFacebook(message, imageUrl);
    }

    console.log(
      "[FB Morning Post]",
      result.success ? `Posted: ${result.postId}` : `Error: ${result.error}`
    );
    res.json({
      success: result.success,
      postId: result.postId,
      error: result.error,
    });
  } catch (err) {
    console.error("[FB Morning Post] Error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

// POST /api/scheduled/fb-afternoon-post
export async function fbAfternoonPostHandler(_req: Request, res: Response) {
  try {
    const latestVideo = await getLatestVideo();
    const now = new Date();

    // Check if BET Awards week (June 21–28, 2026)
    const isBETWeek =
      now.getFullYear() === 2026 &&
      now.getMonth() === 5 &&
      now.getDate() >= 21 &&
      now.getDate() <= 28;

    let result;

    if (isFriday()) {
      // Friday: Zoe Rundown post
      const message = buildFridayRundownPost();
      const imageUrl =
        latestVideo?.thumbnailUrl ||
        "https://i.ytimg.com/vi/Ks-_Mh1QhMc/maxresdefault.jpg";
      result = await postPhotoToFacebook(message, imageUrl);
    } else if (isBETWeek) {
      // BET Awards week: notification reminder + engagement
      const message = buildNotificationReminderPost();
      result = await postToFacebook(message);
    } else {
      // Standard: trending topic with engagement hook
      const topic = await fetchTrendingTopic();
      if (topic) {
        const message = buildEngagementQuestionPost(topic);
        const imageUrl =
          topic.imageUrl ||
          latestVideo?.thumbnailUrl ||
          "https://i.ytimg.com/vi/Ks-_Mh1QhMc/maxresdefault.jpg";
        result = await postPhotoToFacebook(message, imageUrl);
      } else {
        // Fallback: notification reminder (always useful)
        const message = buildNotificationReminderPost();
        result = await postToFacebook(message);
      }
    }

    console.log(
      "[FB Afternoon Post]",
      result.success
        ? `Posted: ${result.postId}`
        : `Error: ${result.error}`
    );
    res.json({
      success: result.success,
      postId: result.postId,
      error: result.error,
    });
  } catch (err) {
    console.error("[FB Afternoon Post] Error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

// POST /api/scheduled/fb-viral-post — manual trigger for immediate viral post
export async function fbViralPostHandler(_req: Request, res: Response) {
  try {
    const betPost = buildBETAwardsPost();
    const latestVideo = await getLatestVideo();
    const imageUrl =
      latestVideo?.thumbnailUrl ||
      "https://i.ytimg.com/vi/Ks-_Mh1QhMc/maxresdefault.jpg";

    const result = await postPhotoToFacebook(betPost.message, imageUrl);
    console.log(
      "[FB Viral Post]",
      result.success ? `Posted: ${result.postId}` : `Error: ${result.error}`
    );
    res.json({
      success: result.success,
      postId: result.postId,
      error: result.error,
      message: "BET Awards 2026 viral engagement post",
    });
  } catch (err) {
    console.error("[FB Viral Post] Error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

// POST /api/scheduled/fb-notification-reminder — asks followers to turn on notifications
export async function fbNotificationReminderHandler(
  _req: Request,
  res: Response
) {
  try {
    const message = buildNotificationReminderPost();
    const result = await postToFacebook(message);
    console.log(
      "[FB Notification Reminder]",
      result.success ? `Posted: ${result.postId}` : `Error: ${result.error}`
    );
    res.json({
      success: result.success,
      postId: result.postId,
      error: result.error,
    });
  } catch (err) {
    console.error("[FB Notification Reminder] Error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
