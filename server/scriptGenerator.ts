/**
 * ZTVLIVE Script Generator
 * 
 * Generates production-ready scripts for:
 * - Zara Daily: 90-second YouTube Shorts (Mon-Thu, 9am EST)
 * - Zoe Weekly: 10-minute Friday recap show (Friday, 12pm EST)
 * 
 * Uses LLM to write natural, engaging scripts optimized for each format.
 */

import { invokeLLM } from "./_core/llm";
import type { TrendingTopic } from "./trendingTopics";

export interface ZaraDailyScript {
  title: string;           // YouTube title (max 100 chars)
  description: string;     // YouTube description (with hashtags)
  tags: string[];          // YouTube tags
  script: string;          // Full spoken script (75-90 seconds)
  brollCues: BrollCue[];   // B-roll insertion points
  segments: ScriptSegment[];
  estimatedDurationSeconds: number;
  outfitLookId: string;    // HeyGen avatar look ID to use
  date: string;            // ISO date string
}

export interface ZoeWeeklyScript {
  title: string;
  description: string;
  tags: string[];
  script: string;          // Full spoken script (8-10 minutes)
  segments: ScriptSegment[];
  brollCues: BrollCue[];
  estimatedDurationSeconds: number;
  outfitLookId: string;
  date: string;
}

export interface ScriptSegment {
  name: string;            // e.g. "INTRO", "SEGMENT 1 — BET Awards"
  text: string;            // Script text for this segment
  durationSeconds: number;
}

export interface BrollCue {
  afterText: string;       // Text that precedes this b-roll insertion
  description: string;     // Description for image generation
  durationSeconds: number; // How long to show b-roll (2-3 sec)
  searchQuery: string;     // Query to use for image generation
}

// Zara's outfit rotation — cycles through Avatar V-compatible looks
// group_id: 930af37b3f2d436ba4e0c7ca3b5df6db
const ZARA_LOOKS = [
  { id: "5f63b90352b24ba3862a5448207730f2", name: "Zara Red Suit ZTV Studio" },
  { id: "0e2c3e4e59e04794a6021a6589060e45", name: "Zara Royal Blue Studio" },
  { id: "1af650014ac0457387e1ebca797f8b9e", name: "Zara Emerald Green Studio" },
  { id: "8448903971ab4a319f0cc4927bf13eb1", name: "Zara Red Blazer Studio" },
  { id: "66732d2ef2fe4fd4ada6a091e321b847", name: "ZTVLIVE Host — Zara V3" },
];

// Zoe's outfit rotation — Avatar IV engine (portrait looks)
// group_id: 0e53bcf9428e468f83abd2620b028524
const ZOE_LOOKS = [
  { id: "15b69dc9e9bd487baa0b1c3e22692724", name: "Zoe" },
  { id: "275ddb348c4a4c99bd168ecf23f0b6f3", name: "Zoe" },
  { id: "a81097e4c05c4a0584486bde97fd4067", name: "Zoe" },
  { id: "aa9192c6b0b54bd3813cddec8099b56c", name: "Zoe" },
  { id: "f42a3a8700214864a77fced28883ede2", name: "Zoe" },
  { id: "f8097a8934a34bd0b610505dcd8ef70e", name: "Zoe" },
  { id: "ad096bf45f6d42bbb6d7a14d3889413e", name: "Zoe" },
  { id: "d970c946b5c04e4899655f4e16e36b9e", name: "Zoe" },
];

/**
 * Get outfit look ID by rotating based on day of month
 */
export function getZaraLookForDay(date: Date): { id: string; name: string } {
  const dayOfMonth = date.getDate();
  return ZARA_LOOKS[dayOfMonth % ZARA_LOOKS.length];
}

export function getZoeLookForWeek(date: Date): { id: string; name: string } {
  const weekOfYear = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
  return ZOE_LOOKS[weekOfYear % ZOE_LOOKS.length];
}

/**
 * Generate Zara Daily script from trending topics
 */
export async function generateZaraDailyScript(
  topics: TrendingTopic[],
  date: Date = new Date()
): Promise<ZaraDailyScript> {
  const look = getZaraLookForDay(date);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shortDate = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const topicsText = topics
    .slice(0, 4)
    .map((t, i) => `TOPIC ${i + 1}: ${t.title}\nSummary: ${t.summary}\nTalking Points: ${t.talkingPoints.join(" | ")}`)
    .join("\n\n");

  const llmResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a scriptwriter for ZTVLIVE's "ZTV Live Daily with Zara" — a daily 90-second YouTube Shorts show hosted by Zara, a confident, warm, relatable Black female host.

SHOW FORMAT:
- Duration: 75-90 seconds (about 180-220 words spoken)
- Format: YouTube Shorts (portrait 9:16)
- Tone: Energetic, conversational, authentic — like a smart friend giving you the tea
- Structure: Intro (5s) → 3-4 news segments (15-20s each) → CTA outro (10s)
- Each segment has a [B-ROLL] cue where visuals cut away from Zara

WRITING RULES:
- Write exactly as Zara would speak — natural, not robotic
- Use contractions, casual language, Black vernacular when authentic
- Keep each segment punchy — 2-3 sentences max
- End with a clear CTA: like, subscribe, visit ZTVlivestream.com
- Include [B-ROLL: description] markers at natural visual cut points
- Include [INTRO] and [OUTRO] stage direction markers

Return a JSON object with this exact structure:
{
  "title": "YouTube title with date and main topic (max 100 chars)",
  "description": "YouTube description (2-3 sentences + hashtags)",
  "tags": ["tag1", "tag2", ...],
  "script": "Full script with [B-ROLL] and [SEGMENT] markers",
  "segments": [{"name": "INTRO", "text": "...", "durationSeconds": 5}, ...],
  "brollCues": [{"afterText": "text before b-roll", "description": "what to show", "durationSeconds": 3, "searchQuery": "image search query"}],
  "estimatedDurationSeconds": 85
}`,
      },
      {
        role: "user",
        content: `Write a Zara Daily script for ${dateStr}.\n\nTODAY'S TRENDING TOPICS:\n${topicsText}\n\nMake it feel fresh, current, and like Zara is genuinely excited about these stories. Keep it under 90 seconds.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "zara_daily_script",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            script: { type: "string" },
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  text: { type: "string" },
                  durationSeconds: { type: "number" },
                },
                required: ["name", "text", "durationSeconds"],
                additionalProperties: false,
              },
            },
            brollCues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  afterText: { type: "string" },
                  description: { type: "string" },
                  durationSeconds: { type: "number" },
                  searchQuery: { type: "string" },
                },
                required: ["afterText", "description", "durationSeconds", "searchQuery"],
                additionalProperties: false,
              },
            },
            estimatedDurationSeconds: { type: "number" },
          },
          required: ["title", "description", "tags", "script", "segments", "brollCues", "estimatedDurationSeconds"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = llmResponse.choices?.[0]?.message?.content ?? "{}";
  let parsed: Omit<ZaraDailyScript, "outfitLookId" | "date">;
  try {
    parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  } catch {
    throw new Error("Failed to parse LLM script response for Zara Daily");
  }

  return {
    ...parsed,
    outfitLookId: look.id,
    date: date.toISOString(),
  };
}

/**
 * Generate Zoe Weekly script from trending topics
 */
export async function generateZoeWeeklyScript(
  topics: TrendingTopic[],
  date: Date = new Date()
): Promise<ZoeWeeklyScript> {
  const look = getZoeLookForWeek(date);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get week range
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - 4); // Monday
  const weekRange = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const topicsText = topics
    .map((t, i) => `STORY ${i + 1}: ${t.title}\nSummary: ${t.summary}\nTalking Points: ${t.talkingPoints.join(" | ")}`)
    .join("\n\n");

  const llmResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a scriptwriter for ZTVLIVE's "The Rundown with Zoe" — a weekly Friday recap show hosted by Zoe, a sophisticated, insightful Black female host who delivers the week's top Black culture and entertainment stories.

SHOW FORMAT:
- Duration: 8-10 minutes (about 1,200-1,500 words spoken)
- Format: Landscape 16:9 (full show format)
- Tone: Professional but warm, like a smart anchor who's also your friend
- Structure: Cold Open (30s) → Week's Top Story (2min) → Music/Entertainment Roundup (2min) → Culture Moment (1.5min) → Weekend Guide (1.5min) → Closing (30s)
- Each segment has [B-ROLL] cues

WRITING RULES:
- More depth than Zara Daily — Zoe gives context, analysis, not just headlines
- Smooth transitions between segments
- Weekend guide: 2-3 specific events/activities for Black audiences
- End with: "I'm Zoe — enjoy your weekend, and I'll see you next Friday"
- Include [B-ROLL: description] markers
- Include segment markers: [COLD OPEN], [TOP STORY], [MUSIC ROUNDUP], [CULTURE MOMENT], [WEEKEND GUIDE], [CLOSING]

Return a JSON object with this structure:
{
  "title": "YouTube title",
  "description": "YouTube description",
  "tags": ["tag1", ...],
  "script": "Full script with markers",
  "segments": [{"name": "COLD OPEN", "text": "...", "durationSeconds": 30}, ...],
  "brollCues": [{"afterText": "...", "description": "...", "durationSeconds": 3, "searchQuery": "..."}],
  "estimatedDurationSeconds": 540
}`,
      },
      {
        role: "user",
        content: `Write Zoe's weekly Friday show script for the week of ${weekRange} (airing ${dateStr}).\n\nTHIS WEEK'S STORIES:\n${topicsText}\n\nMake it feel like a premium weekly show — polished but authentic. Give Zoe's signature warmth and insight.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "zoe_weekly_script",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            script: { type: "string" },
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  text: { type: "string" },
                  durationSeconds: { type: "number" },
                },
                required: ["name", "text", "durationSeconds"],
                additionalProperties: false,
              },
            },
            brollCues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  afterText: { type: "string" },
                  description: { type: "string" },
                  durationSeconds: { type: "number" },
                  searchQuery: { type: "string" },
                },
                required: ["afterText", "description", "durationSeconds", "searchQuery"],
                additionalProperties: false,
              },
            },
            estimatedDurationSeconds: { type: "number" },
          },
          required: ["title", "description", "tags", "script", "segments", "brollCues", "estimatedDurationSeconds"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = llmResponse.choices?.[0]?.message?.content ?? "{}";
  let parsed: Omit<ZoeWeeklyScript, "outfitLookId" | "date">;
  try {
    parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  } catch {
    throw new Error("Failed to parse LLM script response for Zoe Weekly");
  }

  return {
    ...parsed,
    outfitLookId: look.id,
    date: date.toISOString(),
  };
}
