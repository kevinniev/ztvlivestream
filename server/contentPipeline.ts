/**
 * ZTVLIVE Content Pipeline Orchestrator
 * 
 * Ties together all automation steps:
 * 1. Fetch trending topics
 * 2. Generate script
 * 3. Generate b-roll images
 * 4. Submit HeyGen render
 * 5. Poll for completion
 * 6. Upload to YouTube
 * 7. Add to ZTVLIVE database
 * 8. Notify owner
 * 
 * Two pipelines:
 * - runZaraDailyPipeline(): Mon-Thu, 9am EST → YouTube Short
 * - runZoeWeeklyPipeline(): Friday, 12pm EST → Full episode
 * 
 * Both are invoked by scheduled heartbeat handlers.
 * 
 * NOTE: Handler timeout is 2 minutes per call.
 * For long-running renders (15+ min), we use a two-phase approach:
 * Phase 1: Fetch topics + generate script + submit render → store videoId
 * Phase 2: Poll status + upload (triggered by second cron or retry)
 */

import { fetchTrendingTopicsForZaraDaily, fetchTrendingTopicsForZoeWeekly } from "./trendingTopics";
import { generateZaraDailyScript, generateZoeWeeklyScript } from "./scriptGenerator";
import { produceZaraDaily, produceZoeWeekly, pollHeyGenStatus } from "./heygenProducer";
import { uploadToYouTube, addVideoToDatabase, notifyVideoPublished } from "./youtubeUploader";
import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { contentPipelineJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export type PipelineType = "zara-daily" | "zoe-weekly";
export type PipelineStatus = "running" | "render_pending" | "uploading" | "completed" | "failed";

export interface PipelineResult {
  jobId: number;
  status: PipelineStatus;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  title?: string;
  errorMessage?: string;
  durationMs: number;
}

/**
 * Run the Zara Daily pipeline (Phase 1: topics → script → render submission)
 * Returns immediately after submitting the HeyGen render job.
 * Phase 2 (poll + upload) is handled by the render-complete handler.
 */
export async function runZaraDailyPipeline(date: Date = new Date()): Promise<PipelineResult> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[Pipeline] Starting Zara Daily pipeline for ${date.toISOString()}`);

  // Create job record
  const [jobRow] = await db.insert(contentPipelineJobs).values({
    pipelineType: "zara-daily",
    status: "running",
    scheduledDate: date.toISOString().split("T")[0],
    startedAt: BigInt(Date.now()),
  });
  const jobId = (jobRow as any).insertId as number;

  try {
    // Step 1: Fetch trending topics
    console.log(`[Pipeline] Step 1: Fetching trending topics...`);
    const topicsResult = await fetchTrendingTopicsForZaraDaily();
    
    if (topicsResult.topics.length === 0) {
      throw new Error("No trending topics found — cannot generate script");
    }
    console.log(`[Pipeline] Found ${topicsResult.topics.length} topics`);

    // Step 2: Generate script
    console.log(`[Pipeline] Step 2: Generating Zara Daily script...`);
    const script = await generateZaraDailyScript(topicsResult.topics, date);
    console.log(`[Pipeline] Script generated: "${script.title}" (~${script.estimatedDurationSeconds}s)`);

    // Step 3: Submit HeyGen render (includes b-roll generation)
    console.log(`[Pipeline] Step 3: Submitting HeyGen render...`);
    const { videoId: heygenVideoId, brollAssets } = await produceZaraDaily(script);
    console.log(`[Pipeline] HeyGen render submitted: ${heygenVideoId}`);

    // Update job record with render info
    await db.update(contentPipelineJobs)
      .set({
        status: "render_pending",
        heygenVideoId,
        scriptTitle: script.title,
        scriptDescription: script.description,
        scriptTags: script.tags.join(", "),
        outfitLookId: script.outfitLookId,
        brollCount: brollAssets.length,
        updatedAt: BigInt(Date.now()),
      })
      .where(eq(contentPipelineJobs.id, jobId));

    const durationMs = Date.now() - startTime;
    console.log(`[Pipeline] Zara Daily Phase 1 complete in ${durationMs}ms`);

    // Notify owner of render submission
    await notifyOwner({
      title: "🎬 Zara Daily Render Submitted",
      content: `Title: ${script.title}\nHeyGen Video ID: ${heygenVideoId}\nB-roll images: ${brollAssets.length}\nEstimated duration: ${script.estimatedDurationSeconds}s`,
    });

    return {
      jobId,
      status: "render_pending",
      title: script.title,
      durationMs,
    };
  } catch (err: any) {
    const errorMessage = err?.message ?? String(err);
    console.error(`[Pipeline] Zara Daily pipeline failed:`, err);

    await db.update(contentPipelineJobs)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: BigInt(Date.now()),
      })
      .where(eq(contentPipelineJobs.id, jobId));

    await notifyOwner({
      title: "❌ Zara Daily Pipeline Failed",
      content: `Error: ${errorMessage}\nJob ID: ${jobId}`,
    });

    return {
      jobId,
      status: "failed",
      errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Run the Zoe Weekly pipeline (Phase 1: topics → script → render submission)
 */
export async function runZoeWeeklyPipeline(date: Date = new Date()): Promise<PipelineResult> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[Pipeline] Starting Zoe Weekly pipeline for ${date.toISOString()}`);

  const [jobRow] = await db.insert(contentPipelineJobs).values({
    pipelineType: "zoe-weekly",
    status: "running",
    scheduledDate: date.toISOString().split("T")[0],
    startedAt: BigInt(Date.now()),
  });
  const jobId = (jobRow as any).insertId as number;

  try {
    console.log(`[Pipeline] Step 1: Fetching weekly trending topics...`);
    const topicsResult = await fetchTrendingTopicsForZoeWeekly();
    
    if (topicsResult.topics.length === 0) {
      throw new Error("No trending topics found for Zoe Weekly");
    }

    console.log(`[Pipeline] Step 2: Generating Zoe Weekly script...`);
    const script = await generateZoeWeeklyScript(topicsResult.topics, date);
    console.log(`[Pipeline] Script generated: "${script.title}" (~${script.estimatedDurationSeconds}s)`);

    console.log(`[Pipeline] Step 3: Submitting HeyGen render...`);
    const { videoId: heygenVideoId, brollAssets } = await produceZoeWeekly(script);
    console.log(`[Pipeline] HeyGen render submitted: ${heygenVideoId}`);

    await db.update(contentPipelineJobs)
      .set({
        status: "render_pending",
        heygenVideoId,
        scriptTitle: script.title,
        scriptDescription: script.description,
        scriptTags: script.tags.join(", "),
        outfitLookId: script.outfitLookId,
        brollCount: brollAssets.length,
        updatedAt: BigInt(Date.now()),
      })
      .where(eq(contentPipelineJobs.id, jobId));

    const durationMs = Date.now() - startTime;

    await notifyOwner({
      title: "🎬 Zoe Weekly Render Submitted",
      content: `Title: ${script.title}\nHeyGen Video ID: ${heygenVideoId}\nB-roll images: ${brollAssets.length}\nEstimated duration: ${script.estimatedDurationSeconds}s`,
    });

    return {
      jobId,
      status: "render_pending",
      title: script.title,
      durationMs,
    };
  } catch (err: any) {
    const errorMessage = err?.message ?? String(err);
    console.error(`[Pipeline] Zoe Weekly pipeline failed:`, err);

    await db.update(contentPipelineJobs)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: BigInt(Date.now()),
      })
      .where(eq(contentPipelineJobs.id, jobId));

    await notifyOwner({
      title: "❌ Zoe Weekly Pipeline Failed",
      content: `Error: ${errorMessage}\nJob ID: ${jobId}`,
    });

    return {
      jobId,
      status: "failed",
      errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Phase 2: Poll HeyGen render status and upload to YouTube
 * Called by a separate heartbeat cron that checks pending jobs every 30 minutes
 */
export async function processPendingRenders(): Promise<{ processed: number; uploaded: number; failed: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[Pipeline] Checking pending renders...`);

  // Get all jobs in render_pending status
  const pendingJobs = await db.select()
    .from(contentPipelineJobs)
    .where(eq(contentPipelineJobs.status, "render_pending"))
    .limit(5);

  console.log(`[Pipeline] Found ${pendingJobs.length} pending render jobs`);

  let processed = 0;
  let uploaded = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    if (!job.heygenVideoId) continue;
    processed++;

    try {
      console.log(`[Pipeline] Polling HeyGen status for job ${job.id}: ${job.heygenVideoId}`);
      
      // Poll with 5 minute max wait (since we're in a 2-min handler, poll quickly)
      const renderResult = await pollHeyGenStatus(job.heygenVideoId, 5);

      if (renderResult.status === "completed" && renderResult.videoUrl) {
        console.log(`[Pipeline] Render complete for job ${job.id}, uploading to YouTube...`);

        await db.update(contentPipelineJobs)
          .set({ status: "uploading", updatedAt: BigInt(Date.now()) })
          .where(eq(contentPipelineJobs.id, job.id));

        // Upload to YouTube
        const isShort = job.pipelineType === "zara-daily";
        const youtubeResult = await uploadToYouTube({
          videoUrl: renderResult.videoUrl,
          title: job.scriptTitle || "ZTVLIVE Daily",
          description: job.scriptDescription || "ZTVLIVE — Your 24/7 Black Culture Streaming Platform",
          tags: (job.scriptTags || "").split(", ").filter(Boolean),
          isShort,
          thumbnailUrl: renderResult.thumbnailUrl,
        });

        // Add to ZTVLIVE database
        await addVideoToDatabase(youtubeResult, {
          description: job.scriptDescription || "",
          tags: (job.scriptTags || "").split(", ").filter(Boolean),
          category: "news",
          creatorName: isShort ? "Zara" : "Zoe",
          duration: renderResult.durationSeconds
            ? `${Math.floor(renderResult.durationSeconds / 60)}:${String(renderResult.durationSeconds % 60).padStart(2, "0")}`
            : "1:30",
          isFeatured: true,
        });

        // Mark job as completed
        await db.update(contentPipelineJobs)
          .set({
            status: "completed",
            youtubeVideoId: youtubeResult.videoId,
            youtubeUrl: youtubeResult.videoUrl,
            completedAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
          })
          .where(eq(contentPipelineJobs.id, job.id));

        // Notify owner
        await notifyVideoPublished(
          youtubeResult,
          isShort ? "Zara Daily" : "Zoe Weekly"
        );

        uploaded++;
        console.log(`[Pipeline] Job ${job.id} completed: ${youtubeResult.videoUrl}`);

      } else if (renderResult.status === "failed") {
        console.error(`[Pipeline] HeyGen render failed for job ${job.id}`);
        
        await db.update(contentPipelineJobs)
          .set({
            status: "failed",
            errorMessage: "HeyGen render failed",
            updatedAt: BigInt(Date.now()),
          })
          .where(eq(contentPipelineJobs.id, job.id));

        await notifyOwner({
          title: "❌ HeyGen Render Failed",
          content: `Job ID: ${job.id}\nHeyGen Video ID: ${job.heygenVideoId}\nTitle: ${job.scriptTitle}`,
        });

        failed++;
      } else {
        console.log(`[Pipeline] Job ${job.id} still rendering (status: ${renderResult.status})`);
      }
    } catch (err: any) {
      console.error(`[Pipeline] Error processing job ${job.id}:`, err);
      failed++;
    }
  }

  return { processed, uploaded, failed };
}
