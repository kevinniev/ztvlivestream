/**
 * Direct trigger for Zoe Weekly pipeline — bypasses heartbeat auth
 * Run with: npx tsx trigger_zoe_direct.ts
 */
import { runZoeWeeklyPipeline } from "./server/contentPipeline";

console.log("=== ZTVLIVE Zoe Weekly Direct Trigger ===");
console.log("Date:", new Date().toISOString());
console.log("HEYGEN_API_KEY:", process.env.HEYGEN_API_KEY ? "✅ set" : "❌ missing");

try {
  const result = await runZoeWeeklyPipeline(new Date());
  console.log("\n✅ Pipeline Phase 1 complete:");
  console.log("  Job ID:", result.jobId);
  console.log("  Status:", result.status);
  console.log("  Title:", result.title);
  console.log("  HeyGen Video ID:", result.heygenVideoId);
  console.log("  Duration:", result.durationMs, "ms");
} catch (err: any) {
  console.error("\n❌ Pipeline failed:", err.message);
  console.error(err.stack);
  process.exit(1);
}
