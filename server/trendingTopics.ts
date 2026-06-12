/**
 * ZTVLIVE Trending Topics Engine
 * 
 * Fetches viral Black culture, entertainment, and music topics from:
 * - Serper News API (BET, Billboard, Shade Room, Black entertainment)
 * - YouTube trending search (Black music, culture)
 * - LLM synthesis to rank and format topics for Zara Daily / Zoe Weekly
 */

import { callDataApi } from "./_core/dataApi";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

export interface TrendingTopic {
  title: string;
  summary: string;
  source: string;
  url?: string;
  relevanceScore: number; // 0-100
  category: "music" | "entertainment" | "culture" | "sports" | "news" | "lifestyle";
  talkingPoints: string[];
}

export interface TrendingTopicsResult {
  topics: TrendingTopic[];
  fetchedAt: string;
  sources: string[];
}

/**
 * Fetch trending Black culture/entertainment news via Serper API
 */
async function fetchSerperNews(
  query: string,
  num = 5,
  tbs = "qdr:d" // default: last 24 hours
): Promise<Array<{title: string; snippet: string; link: string; source: string}>> {
  try {
    const serperKey = process.env.SerperAPIKeys;
    if (!serperKey) {
      console.warn("[TrendingTopics] SerperAPIKeys not set, skipping Serper fetch");
      return [];
    }

    const response = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num, gl: "us", hl: "en", tbs }),
    });

    if (!response.ok) {
      console.warn(`[TrendingTopics] Serper API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as { news?: Array<{title: string; snippet: string; link: string; source: string}> };
    return data.news || [];
  } catch (err) {
    console.warn("[TrendingTopics] Serper fetch failed:", err);
    return [];
  }
}

/**
 * Fetch trending YouTube videos for Black culture/entertainment
 */
async function fetchYouTubeTrending(query: string): Promise<Array<{title: string; description: string; channelTitle: string}>> {
  try {
    const result = await callDataApi("Youtube/search", {
      query: { q: query, gl: "US", hl: "en" },
    }) as { contents?: Array<{type: string; video?: {title: string; descriptionSnippet: string; channelTitle: string}}> };

    if (!result?.contents) return [];

    return result.contents
      .filter((c) => c.type === "video" && c.video)
      .slice(0, 5)
      .map((c) => ({
        title: c.video!.title || "",
        description: c.video!.descriptionSnippet || "",
        channelTitle: c.video!.channelTitle || "",
      }));
  } catch (err) {
    console.warn("[TrendingTopics] YouTube search failed:", err);
    return [];
  }
}

/**
 * Main function: fetch trending topics for Zara Daily (daily news shorts)
 * Focuses on: BET, Black music, Black entertainment, culture, Juneteenth, etc.
 */
export async function fetchTrendingTopicsForZaraDaily(): Promise<TrendingTopicsResult> {
  console.log("[TrendingTopics] Fetching trending topics for Zara Daily (last 24h)...");

  // Required 4 searches — all filtered to last 24 hours (tbs=qdr:d)
  const searches = [
    { q: "Black entertainment celebrity news today", num: 5 },
    { q: "NBA basketball trending news today", num: 3 },
    { q: "BET Awards streaming TV news today", num: 3 },
    { q: "Arizona entertainment events news today", num: 3 },
  ];

  const allRawArticles: Array<{title: string; snippet: string; source: string; url: string}> = [];

  // Fetch from Serper — last 24 hours only
  for (const s of searches) {
    const articles = await fetchSerperNews(s.q, s.num, "qdr:d");
    for (const a of articles) {
      allRawArticles.push({
        title: a.title,
        snippet: a.snippet,
        source: a.source,
        url: a.link,
      });
    }
  }

  // If Serper returns nothing (no credits / API down), fall back to YouTube trending
  const ytResults = await fetchYouTubeTrending("Black entertainment trending today");

  // Use LLM to synthesize and rank topics
  const rawContent = [
    "=== NEWS ARTICLES ===",
    allRawArticles.map((a, i) => `[${i + 1}] ${a.title}\nSource: ${a.source}\nSnippet: ${a.snippet}`).join("\n\n"),
    "=== YOUTUBE TRENDING ===",
    ytResults.map((v, i) => `[${i + 1}] ${v.title} (${v.channelTitle})\n${v.description}`).join("\n\n"),
  ].join("\n\n");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const llmResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a content strategist for ZTVLIVE, a 24/7 Black culture and entertainment streaming platform. 
Your job is to identify the TOP 4-5 most viral, engaging trending topics from today's news that would resonate with a Black American audience aged 18-45.

Focus on: BET Awards, Black music (hip hop, R&B, gospel), Black celebrities, Black culture moments, Juneteenth, HBCU news, Black entrepreneurship, viral social media moments in Black culture.

Return a JSON object with this exact structure:
{
  "topics": [
    {
      "title": "Short catchy topic title (max 10 words)",
      "summary": "2-3 sentence summary of what happened and why it matters",
      "source": "news source name",
      "url": "article URL if available",
      "relevanceScore": 85,
      "category": "music|entertainment|culture|sports|news|lifestyle",
      "talkingPoints": ["Point 1 for Zara to mention", "Point 2", "Point 3"]
    }
  ]
}

Rank by: viral potential + cultural relevance + freshness. Return exactly 4-5 topics.`,
      },
      {
        role: "user",
        content: `Today is ${today}. Here are the trending articles and videos I found:\n\n${rawContent}\n\nIdentify the top 4-5 most culturally relevant trending topics for ZTVLIVE's Black culture audience.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trending_topics",
        strict: true,
        schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  source: { type: "string" },
                  url: { type: "string" },
                  relevanceScore: { type: "number" },
                  category: { type: "string" },
                  talkingPoints: { type: "array", items: { type: "string" } },
                },
                required: ["title", "summary", "source", "url", "relevanceScore", "category", "talkingPoints"],
                additionalProperties: false,
              },
            },
          },
          required: ["topics"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = llmResponse.choices?.[0]?.message?.content ?? "{}";
  let parsed: { topics: TrendingTopic[] } = { topics: [] };
  try {
    parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  } catch {
    console.warn("[TrendingTopics] Failed to parse LLM response, using empty topics");
  }

  const uniqueSources = Array.from(new Set(allRawArticles.map((a) => a.source).filter(Boolean)));

  return {
    topics: parsed.topics || [],
    fetchedAt: new Date().toISOString(),
    sources: uniqueSources,
  };
}

/**
 * Fetch trending topics for Zoe Weekly (Friday recap show)
 * Broader scope: week's top stories + weekend guide
 */
export async function fetchTrendingTopicsForZoeWeekly(): Promise<TrendingTopicsResult> {
  console.log("[TrendingTopics] Fetching trending topics for Zoe Weekly...");

  const searches = [
    "Black entertainment news this week recap",
    "Black music releases this week Billboard",
    "Black celebrity news viral moments this week",
    "Black culture events weekend guide",
    "Hip hop R&B news week recap",
  ];

  const allRawArticles: Array<{title: string; snippet: string; source: string; url: string}> = [];

  for (const query of searches.slice(0, 4)) {
    const articles = await fetchSerperNews(query, 5);
    for (const a of articles) {
      allRawArticles.push({
        title: a.title,
        snippet: a.snippet,
        source: a.source,
        url: a.link,
      });
    }
  }

  const ytResults = await fetchYouTubeTrending("Black music new releases this week");

  const rawContent = [
    "=== THIS WEEK'S NEWS ===",
    allRawArticles.map((a, i) => `[${i + 1}] ${a.title}\nSource: ${a.source}\nSnippet: ${a.snippet}`).join("\n\n"),
    "=== NEW MUSIC/CONTENT ===",
    ytResults.map((v, i) => `[${i + 1}] ${v.title} (${v.channelTitle})`).join("\n"),
  ].join("\n\n");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const llmResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a content strategist for ZTVLIVE. Zoe hosts a weekly Friday recap show covering the week's top Black culture and entertainment stories plus a weekend guide.

Return a JSON object with this structure:
{
  "topics": [
    {
      "title": "Topic title",
      "summary": "3-4 sentence summary of the week's story",
      "source": "source name",
      "url": "URL",
      "relevanceScore": 90,
      "category": "music|entertainment|culture|sports|news|lifestyle",
      "talkingPoints": ["Week recap point 1", "Point 2", "Weekend guide tip"]
    }
  ]
}

Include 6-8 topics covering: top story of the week, music releases, celebrity news, cultural moment, and 2 weekend event/activity recommendations. Make it feel like a comprehensive weekly roundup.`,
      },
      {
        role: "user",
        content: `Today is ${today} (Friday). Here are this week's trending stories:\n\n${rawContent}\n\nCreate the weekly recap topics for Zoe's Friday show.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_topics",
        strict: true,
        schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  source: { type: "string" },
                  url: { type: "string" },
                  relevanceScore: { type: "number" },
                  category: { type: "string" },
                  talkingPoints: { type: "array", items: { type: "string" } },
                },
                required: ["title", "summary", "source", "url", "relevanceScore", "category", "talkingPoints"],
                additionalProperties: false,
              },
            },
          },
          required: ["topics"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = llmResponse.choices?.[0]?.message?.content ?? "{}";
  let parsed: { topics: TrendingTopic[] } = { topics: [] };
  try {
    parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  } catch {
    console.warn("[TrendingTopics] Failed to parse LLM response for Zoe Weekly");
  }

  const uniqueSources = Array.from(new Set(allRawArticles.map((a) => a.source).filter(Boolean)));

  return {
    topics: parsed.topics || [],
    fetchedAt: new Date().toISOString(),
    sources: uniqueSources,
  };
}
