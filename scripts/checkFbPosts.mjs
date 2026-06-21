/**
 * checkFbPosts.mjs
 * Fetches ZTV Productions recent posts using /me/feed (works with pages_manage_posts permission)
 * Run: node scripts/checkFbPosts.mjs
 */
import "dotenv/config";

const PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const API = "https://graph.facebook.com/v25.0";

if (!PAGE_ID || !TOKEN) {
  console.error("❌ FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN not set");
  process.exit(1);
}

async function fbGet(path, params = {}) {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  return res.json();
}

console.log("\n═══════════════════════════════════════════════");
console.log("  ZTV PRODUCTIONS — FACEBOOK PAGE STATUS");
console.log("═══════════════════════════════════════════════\n");

// 1. Page basic info
const pageInfo = await fbGet(`/${PAGE_ID}`, {
  fields: "name,fan_count,followers_count,category,verification_status",
});
if (pageInfo.error) {
  console.error("❌ Token error:", pageInfo.error.message);
  console.error("\n🔑 YOUR PAGE ACCESS TOKEN HAS EXPIRED or lacks permissions.");
  console.error("   To fix: Go to https://developers.facebook.com/tools/explorer");
  console.error("   → Select your app → Generate User Token with these permissions:");
  console.error("     pages_manage_posts, pages_read_engagement, pages_read_user_content");
  console.error("   → Then exchange for long-lived Page token");
  process.exit(1);
}
console.log(`📄 Page: ${pageInfo.name}`);
console.log(`👥 Fans/Followers: ${pageInfo.fan_count?.toLocaleString()}`);
console.log(`✅ Status: Token is VALID ✓`);

// 2. Try /me/feed (published posts)
console.log("\n─── RECENT PUBLISHED POSTS ─────────────────────\n");
const feed = await fbGet(`/${PAGE_ID}/feed`, {
  fields: "message,story,created_time,permalink_url",
  limit: "10",
});

if (feed.error) {
  console.log(`⚠️  Cannot read posts: ${feed.error.message}`);
  console.log("   Missing permission: pages_read_user_content");
} else {
  const items = feed.data || [];
  console.log(`Found ${items.length} recent posts:\n`);
  for (const post of items) {
    const msg = (post.message || post.story || "(no text)").slice(0, 100).replace(/\n/g, " ");
    const date = new Date(post.created_time).toLocaleString("en-US", {
      timeZone: "America/Phoenix",
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    console.log(`📅 ${date}`);
    console.log(`   "${msg}"`);
    if (post.permalink_url) console.log(`   🔗 ${post.permalink_url}`);
    console.log();
  }
}

// 3. Try published_posts endpoint
console.log("─── PUBLISHED POSTS (alt endpoint) ─────────────\n");
const published = await fbGet(`/${PAGE_ID}/published_posts`, {
  fields: "message,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares",
  limit: "10",
});

if (published.error) {
  console.log(`⚠️  Cannot read published_posts: ${published.error.message}`);
} else {
  const items = published.data || [];
  console.log(`Found ${items.length} published posts:\n`);
  for (const post of items) {
    const reactions = post.reactions?.summary?.total_count ?? 0;
    const comments = post.comments?.summary?.total_count ?? 0;
    const shares = post.shares?.count ?? 0;
    const msg = (post.message || "(no text)").slice(0, 100).replace(/\n/g, " ");
    const date = new Date(post.created_time).toLocaleString("en-US", {
      timeZone: "America/Phoenix",
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    console.log(`📅 ${date}`);
    console.log(`   "${msg}"`);
    console.log(`   ❤️  ${reactions} reactions  💬 ${comments} comments  🔁 ${shares} shares`);
    if (post.permalink_url) console.log(`   🔗 ${post.permalink_url}`);
    console.log();
  }
}

// 4. Check what permissions the token actually has
console.log("─── TOKEN PERMISSIONS ───────────────────────────\n");
const perms = await fbGet(`/me/permissions`);
if (perms.error) {
  console.log(`⚠️  Cannot check permissions: ${perms.error.message}`);
} else {
  const granted = (perms.data || []).filter(p => p.status === "granted").map(p => p.permission);
  const declined = (perms.data || []).filter(p => p.status === "declined").map(p => p.permission);
  console.log("✅ Granted permissions:");
  granted.forEach(p => console.log(`   • ${p}`));
  if (declined.length > 0) {
    console.log("\n❌ Declined/Missing permissions:");
    declined.forEach(p => console.log(`   • ${p}`));
  }
  
  // Check for key missing permissions
  const needed = ["pages_manage_posts", "pages_read_engagement", "pages_read_user_content", "pages_manage_metadata"];
  const missing = needed.filter(p => !granted.includes(p));
  if (missing.length > 0) {
    console.log("\n⚠️  MISSING PERMISSIONS NEEDED FOR FULL AUTOMATION:");
    missing.forEach(p => console.log(`   • ${p}`));
    console.log("\n   To add: Go to https://developers.facebook.com/tools/explorer");
    console.log("   → Add these permissions → Generate new token → Save as FB_PAGE_ACCESS_TOKEN");
  }
}

console.log("\n═══════════════════════════════════════════════\n");
