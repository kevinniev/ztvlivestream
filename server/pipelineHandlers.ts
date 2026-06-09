/**
 * ZTVLIVE Content Pipeline — Scheduled HTTP Handlers
 * 
 * All routes start with /api/scheduled/ per Manus platform requirements.
 * Authentication is via sdk.authenticateRequest() — user.isCron must be true.
 * Handler timeout: 2 minutes per call.
 * 
 * Routes:
 * POST /api/scheduled/zara-daily       — Mon-Thu 9am EST (14:00 UTC)
 * POST /api/scheduled/zoe-weekly       — Friday 12pm EST (17:00 UTC)
 * POST /api/scheduled/render-check     — Every 30 minutes (polls pending renders)
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runZaraDailyPipeline, runZoeWeeklyPipeline, processPendingRenders } from "./contentPipeline";

/**
 * POST /api/scheduled/zara-daily
 * Triggered Mon-Thu at 9am EST (14:00 UTC)
 * Runs: trending topics → script → b-roll → HeyGen render submission
 */
export async function zaraDailyHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log(`[ZaraDaily] Heartbeat triggered at ${new Date().toISOString()} by task ${user.taskUid}`);

    const result = await runZaraDailyPipeline(new Date());

    console.log(`[ZaraDaily] Pipeline Phase 1 complete: job=${result.jobId}, status=${result.status}`);

    return res.json({
      ok: true,
      jobId: result.jobId,
      status: result.status,
      title: result.title,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    console.error("[ZaraDaily] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * POST /api/scheduled/zoe-weekly
 * Triggered Friday at 12pm EST (17:00 UTC)
 * Runs: trending topics → script → b-roll → HeyGen render submission
 */
export async function zoeWeeklyHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log(`[ZoeWeekly] Heartbeat triggered at ${new Date().toISOString()} by task ${user.taskUid}`);

    const result = await runZoeWeeklyPipeline(new Date());

    console.log(`[ZoeWeekly] Pipeline Phase 1 complete: job=${result.jobId}, status=${result.status}`);

    return res.json({
      ok: true,
      jobId: result.jobId,
      status: result.status,
      title: result.title,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    console.error("[ZoeWeekly] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * POST /api/scheduled/render-check
 * Triggered every 30 minutes
 * Polls HeyGen for completed renders and uploads to YouTube
 */
export async function renderCheckHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log(`[RenderCheck] Heartbeat triggered at ${new Date().toISOString()}`);

    const result = await processPendingRenders();

    console.log(`[RenderCheck] Complete: processed=${result.processed}, uploaded=${result.uploaded}, failed=${result.failed}`);

    return res.json({
      ok: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[RenderCheck] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}
