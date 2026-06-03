/**
 * Direct Creator Scout runner — run with: npx tsx scripts/run-scout.ts
 */
import { runCreatorScout } from "../server/creatorScout";

async function main() {
  console.log("🚀 Starting Creator Scout scan across all 6 niches...\n");
  console.log("Niches: tech, gaming, culture, news, podcasts, sports\n");

  try {
    const result = await runCreatorScout("manual");
    console.log("\n✅ Creator Scout scan complete!");
    console.log(`   Run ID: ${result.runId}`);
    console.log(`   Prospects found: ${result.prospectsFound}`);
    console.log(`   New prospects added: ${result.prospectsNew}`);
    console.log(`   Skipped (duplicates): ${result.prospectsSkipped}`);
    console.log(`   Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log(`   Niches scanned: ${result.niches.join(", ")}`);
  } catch (err: any) {
    console.error("❌ Creator Scout failed:", err?.message);
    process.exit(1);
  }
}

main();
