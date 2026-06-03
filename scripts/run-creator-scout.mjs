/**
 * Standalone Creator Scout runner — bypasses HTTP auth
 * Run with: node scripts/run-creator-scout.mjs
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Load env
const dotenvPath = path.join(projectRoot, ".env");
try {
  const { config } = await import("dotenv");
  config({ path: dotenvPath });
} catch {}

// Register tsx for TypeScript imports
const { register } = await import("tsx/esm/api");
register();

// Now import the TypeScript module
const { runCreatorScout } = await import(
  pathToFileURL(path.join(projectRoot, "server/creatorScout.ts")).href
);

console.log("🚀 Starting Creator Scout scan across all 6 niches...\n");
console.log("Niches: tech, gaming, culture, news, podcasts, sports\n");

try {
  const result = await runCreatorScout("manual");
  console.log("\n✅ Creator Scout scan complete!");
  console.log(`   Run ID: ${result.runId}`);
  console.log(`   Prospects found: ${result.prospectsFound}`);
  console.log(`   New prospects: ${result.prospectsNew}`);
  console.log(`   Skipped (duplicates): ${result.prospectsSkipped}`);
  console.log(`   Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log(`   Niches scanned: ${result.niches.join(", ")}`);
} catch (err) {
  console.error("❌ Creator Scout failed:", err.message);
  process.exit(1);
}
