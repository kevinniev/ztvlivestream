/**
 * checkFbDirect.mjs
 * Uses the Page Access Token directly to check page posts and token debug info
 */
import "dotenv/config";

const PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const API = "https://graph.facebook.com/v25.0";

async function fbGet(path, params = {}) {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json();
}

console.log("\n═══════════════════════════════════════════════");
console.log("  ZTV PRODUCTIONS — FB TOKEN & POSTS DEBUG");
console.log("═══════════════════════════════════════════════\n");

// 1. Debug the token itself
console.log("─── TOKEN DEBUG ─────────────────────────────────\n");
const debug = await fbGet("/debug_token", {
  input_token: TOKEN,
  access_token: TOKEN,
});
if (debug.data) {
  const d = debug.data;
  console.log(`Token Type: ${d.type}`);
  console.log(`App ID: ${d.app_id}`);
  console.log(`Valid: ${d.is_valid}`);
  console.log(`Expires: ${d.expires_at ? new Date(d.expires_at * 1000).toLocaleString() : "Never (long-lived)"}`);
  console.log(`Scopes: ${(d.scopes || []).join(", ")}`);
  if (d.error) console.log(`Error: ${d.error.message}`);
} else {
  console.log("Token debug response:", JSON.stringify(debug, null, 2));
}

// 2. Try to get page posts using the page token directly
console.log("\n─── PAGE POSTS (using page token) ──────────────\n");
const posts = await fbGet(`/${PAGE_ID}/posts`, {
  fields: "message,created_time,permalink_url",
  limit: "5",
});
if (posts.error) {
  console.log(`Posts error: ${posts.error.message} (code: ${posts.error.code})`);
} else {
  for (const p of posts.data || []) {
    const date = new Date(p.created_time).toLocaleString("en-US", { timeZone: "America/Phoenix" });
    console.log(`[${date}] ${(p.message || "").slice(0, 80)}`);
    console.log(`  → ${p.permalink_url}`);
  }
}

// 3. Try the page's own feed using the page ID as "me"
console.log("\n─── PAGE FEED (me/feed) ─────────────────────────\n");
const meFeed = await fbGet(`/me/feed`, {
  fields: "message,created_time,permalink_url",
  limit: "5",
});
if (meFeed.error) {
  console.log(`me/feed error: ${meFeed.error.message}`);
} else {
  for (const p of meFeed.data || []) {
    const date = new Date(p.created_time).toLocaleString("en-US", { timeZone: "America/Phoenix" });
    console.log(`[${date}] ${(p.message || "").slice(0, 80)}`);
  }
}

// 4. Try page photos (our photo posts)
console.log("\n─── PAGE PHOTOS (our photo posts) ───────────────\n");
const photos = await fbGet(`/${PAGE_ID}/photos`, {
  fields: "name,created_time,link,images",
  type: "uploaded",
  limit: "5",
});
if (photos.error) {
  console.log(`Photos error: ${photos.error.message}`);
} else {
  for (const p of photos.data || []) {
    const date = new Date(p.created_time).toLocaleString("en-US", { timeZone: "America/Phoenix" });
    console.log(`[${date}] ${(p.name || "").slice(0, 80)}`);
    if (p.link) console.log(`  → ${p.link}`);
  }
  if ((photos.data || []).length === 0) console.log("No photos found.");
}

console.log("\n═══════════════════════════════════════════════\n");
