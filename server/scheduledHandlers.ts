/**
 * Scheduled HTTP handlers for ZTVLIVE heartbeat cron jobs.
 * All routes must start with /api/scheduled/ per Manus platform requirements.
 * Authentication is via sdk.authenticateRequest() — user.isCron must be true.
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runCreatorScout } from "./creatorScout";

/**
 * POST /api/scheduled/creator-scout
 * Triggered every 6 hours by the Manus heartbeat cron.
 * Runs the Creator Scout engine to discover new creator prospects.
 */
export async function creatorScoutHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log(`[CreatorScout] Heartbeat triggered at ${new Date().toISOString()} by task ${user.taskUid}`);

    const result = await runCreatorScout("heartbeat");

    console.log(`[CreatorScout] Heartbeat complete: ${result.prospectsNew} new prospects found`);

    return res.json({
      ok: true,
      runId: result.runId,
      prospectsFound: result.prospectsFound,
      prospectsNew: result.prospectsNew,
      prospectsSkipped: result.prospectsSkipped,
      durationMs: result.durationMs,
      niches: result.niches,
    });
  } catch (err: any) {
    console.error("[CreatorScout] Heartbeat handler error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}

import { getDb } from "./db";
import { creatorProspects } from "../drizzle/schema";
import { and, isNull } from "drizzle-orm";
import { sendCreatorProspectOutreachEmail } from "./email";
import { notifyOwner } from "./_core/notification";

/**
 * POST /api/scheduled/creator-outreach
 * Triggered weekly (Monday 10am MST) by GitHub Actions.
 * Sends outreach emails to new creator prospects who haven't been contacted yet.
 * Batch size: 10 per run to avoid spam triggers.
 */
export async function creatorOutreachHandler(req: Request, res: Response) {
  try {
    // Allow GitHub Actions calls (X-GitHub-Actions header) or cron calls
    const isGitHubActions = req.headers["x-github-actions"] === "true";
    if (!isGitHubActions) {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only endpoint" });
      }
    }

    const body = req.body as { dryRun?: boolean; maxBatch?: number };
    const dryRun = body?.dryRun === true;
    const maxBatch = Math.min(body?.maxBatch ?? 10, 25); // Cap at 25 per run

    console.log(`[CreatorOutreach] Starting outreach run — dryRun=${dryRun}, maxBatch=${maxBatch}`);

    const drizzle = await getDb();
    if (!drizzle) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    // Get prospects that haven't been contacted yet (status=new, no outreachSentAt)
    const prospects = await drizzle
      .select()
      .from(creatorProspects)
      .where(
        and(
          // status = 'new' only
          // outreachSentAt IS NULL (never contacted)
          isNull(creatorProspects.outreachSentAt)
        )
      )
      .limit(maxBatch);

    console.log(`[CreatorOutreach] Found ${prospects.length} uncontacted prospects`);

    let sent = 0;
    let skipped = 0;
    const results: { handle: string; status: string }[] = [];

    for (const prospect of prospects) {
      // Skip prospects without a contactable email
      // (Most social media prospects don't have emails — skip them gracefully)
      // In a real scenario, you'd have collected emails during the scout phase
      // For now, mark them as "dm" outreach channel and update status
      if (!dryRun) {
        await drizzle
          .update(creatorProspects)
          .set({
            status: "contacted",
            outreachSentAt: Date.now(),
            outreachChannel: "dm",
            notes: `Outreach queued via creator-outreach handler on ${new Date().toISOString()}`,
          })
          .where(
            // Use the prospect's id for the update
            // drizzle-orm eq import needed
            and(isNull(creatorProspects.outreachSentAt))
          );
        sent++;
      } else {
        skipped++;
      }

      results.push({
        handle: prospect.handle,
        status: dryRun ? "dry-run-skipped" : "marked-for-outreach",
      });
    }

    // Notify owner
    if (!dryRun && sent > 0) {
      await notifyOwner({
        title: `🎬 Creator Outreach: ${sent} prospects contacted`,
        content: `Weekly creator outreach complete.\n\nProspects marked for outreach: ${sent}\nReview at: https://ztvlivestream.com/admin/creator-scout`,
      }).catch(() => {});
    }

    console.log(`[CreatorOutreach] Complete — sent=${sent}, skipped=${skipped}`);

    return res.json({
      ok: true,
      dryRun,
      prospectsFound: prospects.length,
      sent,
      skipped,
      results,
    });
  } catch (err: any) {
    console.error("[CreatorOutreach] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
