/**
 * ZTVLIVE Social Listening Engine
 * Monitors trending hashtags and keywords via Serper News API
 * Detects potential creator leads, brand mentions, and engagement opportunities
 * Sends SMS alerts via Twilio for high-priority signals
 * Runs every 6 hours via heartbeat cron
 */

import { Request, Response } from "express";
import twilio from "twilio";

const SERPER_KEY = process.env.SerperAPIKeys || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER || "";
const OWNER_PHONE = process.env.OWNER_PHONE || process.env.TWILIO_FROM_NUMBER || "";

// Keywords that indicate a creator lead or high-value opportunity
const CREATOR_SIGNALS = [
  "looking for streaming platform",
  "need a streaming home",
  "independent creator",
  "black content creator",
  "black youtuber",
  "black streamer",
  "black podcaster",
  "creator monetization",
  "streaming deal",
  "content deal",
  "eliances",
  "million dollar mingle",
  "communityCut",
  "ztvlive",
  "ztvlivestream",
];

// Hashtags to monitor for brand mentions and community engagement
const MONITOR_QUERIES = [
  { q: "ZTVLIVE OR ztvlivestream", label: "Brand Mention" },
  { q: "Black streaming platform creator 2026", label: "Creator Lead" },
  { q: "Black entertainment streaming news today", label: "Industry News" },
  { q: "NBA BET Awards Black culture trending today", label: "Culture Trend" },
  { q: "Arizona entertainment events streaming creator", label: "Local Lead" },
];

interface NewsArticle {
  title: string;
  link: string;
  snippet?: string;
  source: string;
  date?: string;
}

interface SerperNewsResponse {
  news?: NewsArticle[];
}

async function searchSerper(query: string): Promise<NewsArticle[]> {
  if (!SERPER_KEY) return [];
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    const data = (await res.json()) as SerperNewsResponse;
    return data.news || [];
  } catch {
    return [];
  }
}

function isRecent(dateStr?: string): boolean {
  if (!dateStr) return false;
  const lower = dateStr.toLowerCase();
  return (
    lower.includes("hour") ||
    lower.includes("min") ||
    lower.includes("just now") ||
    (lower.includes("day") && !lower.includes("week"))
  );
}

function isCreatorLead(article: NewsArticle): boolean {
  const text = `${article.title} ${article.snippet || ""}`.toLowerCase();
  return CREATOR_SIGNALS.some((signal) => text.includes(signal.toLowerCase()));
}

async function sendSmsAlert(message: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !OWNER_PHONE) {
    console.log("[Social Listening] SMS not configured, skipping alert");
    return;
  }
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: message,
      from: TWILIO_FROM,
      to: OWNER_PHONE,
    });
    console.log("[Social Listening] SMS alert sent");
  } catch (err) {
    console.error("[Social Listening] SMS error:", err);
  }
}

interface ListeningResult {
  label: string;
  query: string;
  articlesFound: number;
  recentArticles: number;
  creatorLeads: number;
  highlights: string[];
}

// POST /api/scheduled/social-listening
export async function socialListeningHandler(_req: Request, res: Response) {
  const report: ListeningResult[] = [];
  const brandMentions: string[] = [];
  const creatorLeads: string[] = [];
  const trendingTopics: string[] = [];

  try {
    for (const monitor of MONITOR_QUERIES) {
      const articles = await searchSerper(monitor.q);
      const recent = articles.filter((a) => isRecent(a.date));
      const leads = recent.filter((a) => isCreatorLead(a));

      const highlights = recent.slice(0, 2).map((a) => `${a.title} (${a.source})`);

      report.push({
        label: monitor.label,
        query: monitor.q,
        articlesFound: articles.length,
        recentArticles: recent.length,
        creatorLeads: leads.length,
        highlights,
      });

      // Collect brand mentions
      if (monitor.label === "Brand Mention" && recent.length > 0) {
        recent.forEach((a) => brandMentions.push(`${a.title} — ${a.source}`));
      }

      // Collect creator leads
      if (leads.length > 0) {
        leads.forEach((a) => creatorLeads.push(`${a.title} — ${a.link}`));
      }

      // Collect trending topics for culture/industry
      if ((monitor.label === "Culture Trend" || monitor.label === "Industry News") && recent.length > 0) {
        trendingTopics.push(recent[0].title);
      }
    }

    // Send SMS alert if brand mentions found
    if (brandMentions.length > 0) {
      const msg = `🔔 ZTVLIVE Brand Mention Alert!\n\n${brandMentions.slice(0, 2).join("\n\n")}\n\nCheck ztvlivestream.com`;
      await sendSmsAlert(msg);
    }

    // Send SMS alert if creator leads found
    if (creatorLeads.length > 0) {
      const msg = `🎯 ZTVLIVE Creator Lead Detected!\n\n${creatorLeads.slice(0, 2).join("\n\n")}\n\nReach out now!`;
      await sendSmsAlert(msg);
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalQueries: MONITOR_QUERIES.length,
      brandMentions: brandMentions.length,
      creatorLeads: creatorLeads.length,
      trendingTopics: trendingTopics.slice(0, 3),
      report,
      alerts: {
        brandMentionsSent: brandMentions.length > 0,
        creatorLeadsSent: creatorLeads.length > 0,
      },
    };

    console.log("[Social Listening] Scan complete:", JSON.stringify(summary, null, 2));
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error("[Social Listening] Error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
