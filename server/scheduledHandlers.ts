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
