/**
 * Automated LinkedIn posting handler for ZTVLIVE.
 *
 * Schedule: 2 posts per week (Heartbeat cron — no agent needed, all logic inline)
 *   POST 1 — Tuesday 10:00 AM MST (17:00 UTC): Creator Economy / Platform Growth angle
 *   POST 2 — Friday  10:00 AM MST (17:00 UTC): Weekly recap / Thought leadership angle
 *
 * Posts to Kevin Johnson's personal LinkedIn profile via the LinkedIn API
 * using the OAuth access token stored in LINKEDIN_ACCESS_TOKEN env var.
 *
 * LinkedIn API used: UGC Posts (User Generated Content)
 * Endpoint: POST https://api.linkedin.com/v2/ugcPosts
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";

// ─── LinkedIn API helper ─────────────────────────────────────────────────────

interface LinkedInPostResult {
  id: string;
}

async function postToLinkedIn(text: string): Promise<LinkedInPostResult> {
  const token = (process.env.LINKEDIN_ACCESS_TOKEN ?? "").trim();
  const personUrn = (process.env.LINKEDIN_PERSON_URN ?? "").trim();

  if (!token || !personUrn) {
    throw new Error("LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN not configured");
  }

  const body = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

// ─── Content generators ──────────────────────────────────────────────────────

async function generateTuesdayPost(): Promise<string> {
  const dayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Phoenix",
  });

  // Rotate through 4 creator economy angles based on week number
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
  const angles = [
    "creator monetization and the 70% revenue share model",
    "why streaming is the future of independent content creation",
    "how ZTVLIVE helps creators reach Roku and Fire TV audiences without a network deal",
    "the rise of creator-led media companies and what it means for traditional TV",
  ];
  const angle = angles[weekNum];

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are Kevin Johnson, Founder & CEO of ZTVLIVE Streaming Platform and CommunityCut. 
Write a professional LinkedIn post (200-280 words) about ${angle}. 
Tone: visionary, confident, authentic — like a founder sharing genuine insight.
Structure: Hook (1-2 lines) → Insight/Story (3-4 lines) → ZTVLIVE connection (2-3 lines) → CTA (1 line)
End with 4-5 relevant hashtags on a new line.
Do NOT use emojis. Do NOT use bullet points. Write in flowing paragraphs.
Always end with: "Learn more at ztvlivestream.com"`,
        },
        {
          role: "user",
          content: `Write the Tuesday LinkedIn post for ${dayLabel}. Topic: ${angle}.`,
        },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.length > 50) {
      return content.trim();
    }
  } catch (err) {
    console.error("[LinkedIn Tuesday] LLM error, using fallback:", err);
  }

  // Fallback post
  return `The creator economy is not a trend — it is a structural shift in how media is made and distributed.

For the past decade, creators have built massive audiences on platforms that take 30-50% of their revenue and can demonetize them overnight. ZTVLIVE was built to change that equation.

At ZTVLIVE, creators keep 70% of everything they earn. Their content streams on Roku, Fire TV, and every major connected TV platform — the same screens where people watch Netflix and HBO. No gatekeepers. No network deals. Just creators owning their distribution.

We are in the early innings of a world where the best content does not come from studios — it comes from independent creators who know their audience better than any executive ever could.

If you are building in the creator economy, I would love to connect and exchange ideas.

Learn more at ztvlivestream.com

#CreatorEconomy #StreamingTV #ContentCreators #ZTVLIVE #MediaInnovation`;
}

async function generateFridayPost(): Promise<string> {
  const dayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Phoenix",
  });

  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
  const angles = [
    "lessons learned building a streaming platform from scratch",
    "what traditional TV networks get wrong about the modern viewer",
    "how on-demand services like CommunityCut are reshaping local service industries",
    "the intersection of live streaming, community, and commerce",
  ];
  const angle = angles[weekNum];

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are Kevin Johnson, Founder & CEO of ZTVLIVE Streaming Platform and CommunityCut.
Write a professional Friday LinkedIn post (200-280 words) — a weekly reflection or thought leadership piece about: ${angle}.
Tone: reflective, genuine, forward-looking — like a founder sharing hard-won lessons.
Structure: Opening reflection (2-3 lines) → Key insight or story (3-4 lines) → How this connects to ZTVLIVE or CommunityCut (2-3 lines) → Weekend CTA or question to audience (1-2 lines)
End with 4-5 relevant hashtags on a new line.
Do NOT use emojis. Do NOT use bullet points. Write in flowing paragraphs.
Always mention ztvlivestream.com somewhere naturally.`,
        },
        {
          role: "user",
          content: `Write the Friday LinkedIn post for ${dayLabel}. Topic: ${angle}.`,
        },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.length > 50) {
      return content.trim();
    }
  } catch (err) {
    console.error("[LinkedIn Friday] LLM error, using fallback:", err);
  }

  // Fallback post
  return `Ending the week with a reflection on what it actually takes to build a media platform in 2025.

When we launched ZTVLIVE, the conventional wisdom was that you needed a network, a studio, and millions in funding to compete in streaming. We proved that wrong. What you actually need is a clear value proposition for creators, a distribution strategy that meets viewers where they already are, and the patience to build trust one creator at a time.

This week, we crossed another milestone in creator sign-ups. Every new creator who joins ZTVLIVE is a vote of confidence that the 70% revenue share model works — and that creators deserve a platform that treats them as partners, not content suppliers.

CommunityCut is following the same philosophy in the grooming industry: professionals keep 92% of their earnings and own their client relationships. The platforms that win the next decade will be the ones that align incentives with the people doing the actual work.

What are you building this weekend? I would love to hear from founders and creators in my network.

ztvlivestream.com

#Entrepreneurship #CreatorEconomy #Streaming #ZTVLIVE #FounderLife`;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * Tuesday 10am MST (17:00 UTC) — Creator Economy angle
 */
export async function linkedinTuesdayPostHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });

    const text = await generateTuesdayPost();
    const result = await postToLinkedIn(text);

    console.log(`[LinkedIn Tuesday] Posted successfully: ${result.id}`);
    return res.json({ ok: true, postId: result.id, length: text.length });
  } catch (err: any) {
    console.error("[LinkedIn Tuesday] Error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url, handler: "linkedinTuesdayPost" },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Friday 10am MST (17:00 UTC) — Weekly recap / thought leadership
 */
export async function linkedinFridayPostHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });

    const text = await generateFridayPost();
    const result = await postToLinkedIn(text);

    console.log(`[LinkedIn Friday] Posted successfully: ${result.id}`);
    return res.json({ ok: true, postId: result.id, length: text.length });
  } catch (err: any) {
    console.error("[LinkedIn Friday] Error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url, handler: "linkedinFridayPost" },
      timestamp: new Date().toISOString(),
    });
  }
}
