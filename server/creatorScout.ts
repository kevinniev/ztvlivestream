/**
 * ZTVLIVE Creator Scout Engine
 * ─────────────────────────────
 * Uses LLM to discover and score creator prospects across niches.
 * Runs on a heartbeat schedule — no external social API keys required.
 * The LLM generates realistic, research-based creator profiles using its
 * knowledge of active creators in each niche, then we deduplicate and score.
 */

import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { creatorProspects, scoutScanRuns } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

// ── Niche definitions ────────────────────────────────────────────────────────

export const SCOUT_NICHES = [
  {
    id: "tech",
    label: "Tech & Gadgets",
    keywords: ["tech review", "gadget", "unboxing", "smartphone", "laptop", "AI tools"],
    platforms: ["youtube", "tiktok"],
    minFollowers: 1000,
    maxFollowers: 200000,
  },
  {
    id: "gaming",
    label: "Gaming",
    keywords: ["gaming", "game review", "let's play", "esports", "console", "PC gaming"],
    platforms: ["youtube", "tiktok", "twitter"],
    minFollowers: 500,
    maxFollowers: 150000,
  },
  {
    id: "culture",
    label: "Black Culture & Lifestyle",
    keywords: ["black excellence", "culture", "lifestyle", "community", "empowerment"],
    platforms: ["youtube", "instagram", "tiktok"],
    minFollowers: 1000,
    maxFollowers: 500000,
  },
  {
    id: "news",
    label: "News & Commentary",
    keywords: ["news commentary", "current events", "politics", "social issues", "analysis"],
    platforms: ["youtube", "twitter"],
    minFollowers: 2000,
    maxFollowers: 300000,
  },
  {
    id: "podcasts",
    label: "Podcasts & Talk Shows",
    keywords: ["podcast", "talk show", "interview", "discussion", "conversation"],
    platforms: ["youtube", "instagram"],
    minFollowers: 500,
    maxFollowers: 100000,
  },
  {
    id: "sports",
    label: "Sports & Fitness",
    keywords: ["sports", "fitness", "workout", "NBA", "NFL", "sports analysis"],
    platforms: ["youtube", "tiktok", "instagram"],
    minFollowers: 1000,
    maxFollowers: 200000,
  },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface ProspectData {
  handle: string;
  platform: "youtube" | "instagram" | "tiktok" | "twitter" | "reddit" | "other";
  profileUrl: string;
  displayName: string;
  bio: string;
  followerCount: number;
  videoCount: number;
  avgViews: number;
  engagementRate: string;
  niche: string;
  tags: string[];
  fitReason: string;
}

interface ScanResult {
  runId: string;
  prospectsFound: number;
  prospectsNew: number;
  prospectsSkipped: number;
  niches: string[];
  durationMs: number;
}

// ── Fingerprint (deduplication) ──────────────────────────────────────────────

function fingerprint(platform: string, handle: string): string {
  return createHash("sha256")
    .update(`${platform}:${handle.toLowerCase().replace(/[@\s]/g, "")}`)
    .digest("hex")
    .slice(0, 32);
}

// ── Fit score calculator ─────────────────────────────────────────────────────

function calculateScore(p: ProspectData): number {
  let score = 0;

  // Follower range sweet spot (1K–100K = ideal for ZTVLIVE)
  if (p.followerCount >= 1000 && p.followerCount <= 100000) score += 30;
  else if (p.followerCount > 100000 && p.followerCount <= 500000) score += 20;
  else if (p.followerCount > 500000) score += 10;
  else score += 5;

  // Engagement rate
  const engNum = parseFloat(p.engagementRate?.replace("%", "") || "0");
  if (engNum >= 5) score += 25;
  else if (engNum >= 3) score += 18;
  else if (engNum >= 1) score += 10;

  // Video count (active creator)
  if (p.videoCount >= 50) score += 20;
  else if (p.videoCount >= 20) score += 12;
  else if (p.videoCount >= 5) score += 6;

  // Avg views
  if (p.avgViews >= 10000) score += 15;
  else if (p.avgViews >= 1000) score += 10;
  else if (p.avgViews >= 100) score += 5;

  // Platform bonus (YouTube = best for ZTVLIVE)
  if (p.platform === "youtube") score += 10;
  else if (p.platform === "tiktok") score += 7;
  else score += 4;

  return Math.min(score, 100);
}

// ── LLM-powered prospect discovery ──────────────────────────────────────────

async function discoverProspectsForNiche(niche: (typeof SCOUT_NICHES)[0], count = 8): Promise<ProspectData[]> {
  const prompt = `You are a talent scout for ZTVLIVE, a premium 24/7 streaming platform that pays creators 70% revenue share.

Your job: identify ${count} real or highly realistic content creators in the "${niche.label}" niche who would be great fits for ZTVLIVE.

Target profile:
- Platforms: ${niche.platforms.join(", ")}
- Follower range: ${niche.minFollowers.toLocaleString()} – ${niche.maxFollowers.toLocaleString()}
- Active creators posting regularly
- Content topics: ${niche.keywords.join(", ")}
- Independent creators (not already on major networks)

For each creator, provide realistic data. You may use real creators you know of, or generate realistic fictional ones that match the profile.

Return a JSON array with exactly ${count} objects. Each object must have:
{
  "handle": "@username (no spaces)",
  "platform": "youtube|instagram|tiktok|twitter",
  "profileUrl": "full URL to their profile",
  "displayName": "Their display name",
  "bio": "1-2 sentence bio describing their content",
  "followerCount": number,
  "videoCount": number,
  "avgViews": number,
  "engagementRate": "X.X%",
  "niche": "${niche.id}",
  "tags": ["tag1", "tag2", "tag3"],
  "fitReason": "1 sentence on why they'd be great for ZTVLIVE"
}

Return ONLY the JSON array, no other text.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a creator talent scout. Always return valid JSON arrays only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" } as any,
    });

    const rawContent = response.choices?.[0]?.message?.content ?? "[]";
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    
    // Try to parse — handle both array and {prospects:[...]} shapes
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Extract JSON array from response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) parsed = JSON.parse(match[0]);
      else return [];
    }

    const arr: ProspectData[] = Array.isArray(parsed) ? parsed : (parsed.prospects ?? parsed.creators ?? []);
    return arr.filter((p) => p.handle && p.platform && p.profileUrl);
  } catch (err: any) {
    console.error(`[CreatorScout] LLM error for niche ${niche.id}:`, err?.message);
    return [];
  }
}

// ── Main scan function ────────────────────────────────────────────────────────

export async function runCreatorScout(
  triggeredBy: "heartbeat" | "manual" | "admin" = "manual",
  nichesToScan?: string[]
): Promise<ScanResult> {
  const runId = randomUUID();
  const startedAt = Date.now();

  // Filter niches
  const niches = nichesToScan
    ? SCOUT_NICHES.filter((n) => nichesToScan.includes(n.id))
    : SCOUT_NICHES;

  // Create scan run record
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scoutScanRuns).values({
    runId,
    triggeredBy,
    status: "running",
    nichesScanned: JSON.stringify(niches.map((n) => n.id)),
  });

  let totalFound = 0;
  let totalNew = 0;
  let totalSkipped = 0;

  try {
    for (const niche of niches) {
      console.log(`[CreatorScout] Scanning niche: ${niche.label}`);
      
      const prospects = await discoverProspectsForNiche(niche, 6);
      totalFound += prospects.length;

      for (const p of prospects) {
        const fp = fingerprint(p.platform, p.handle);
        
        // Check for duplicate
        const existing = await db
          .select({ id: creatorProspects.id })
          .from(creatorProspects)
          .where(eq(creatorProspects.fingerprint, fp))
          .limit(1);

        if (existing.length > 0) {
          // Update lastSeenAt for existing prospects
          await db
            .update(creatorProspects)
            .set({ lastSeenAt: new Date() })
            .where(eq(creatorProspects.fingerprint, fp));
          totalSkipped++;
          continue;
        }

        // Insert new prospect
        const score = calculateScore(p);
        await db.insert(creatorProspects).values({
          handle: p.handle,
          platform: p.platform,
          profileUrl: p.profileUrl,
          displayName: p.displayName,
          bio: p.bio,
          followerCount: p.followerCount || 0,
          videoCount: p.videoCount || 0,
          avgViews: p.avgViews || 0,
          engagementRate: p.engagementRate,
          niche: p.niche || niche.id,
          score,
          tags: JSON.stringify(p.tags || []),
          status: "new",
          fingerprint: fp,
          scanRunId: runId,
          notes: p.fitReason,
        });
        totalNew++;
      }

      // Small delay between niches to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
    }

    // Mark run as completed
    await db
      .update(scoutScanRuns)
      .set({
        status: "completed",
        prospectsFound: totalFound,
        prospectsNew: totalNew,
        prospectsSkipped: totalSkipped,
        completedAt: new Date(),
      })
      .where(eq(scoutScanRuns.runId, runId));

    console.log(`[CreatorScout] Run ${runId} complete: ${totalNew} new, ${totalSkipped} skipped`);
  } catch (err: any) {
    await db
      .update(scoutScanRuns)
      .set({
        status: "failed",
        errorMessage: err?.message ?? String(err),
        completedAt: new Date(),
      })
      .where(eq(scoutScanRuns.runId, runId));
    throw err;
  }

  return {
    runId,
    prospectsFound: totalFound,
    prospectsNew: totalNew,
    prospectsSkipped: totalSkipped,
    niches: niches.map((n) => n.id),
    durationMs: Date.now() - startedAt,
  };
}
