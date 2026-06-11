import { runZoeWeeklyPipeline } from "./server/contentPipeline";

async function main() {
  console.log("🎬 Starting Zoe Weekly pipeline manually (triggered June 10, 2026)...");
  try {
    const result = await runZoeWeeklyPipeline(new Date());
    console.log("✅ Pipeline result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("❌ Pipeline error:", err);
    process.exit(1);
  }
}

main();
