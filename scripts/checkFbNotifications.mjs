/**
 * checkFbNotifications.mjs
 * Fetches ZTV Productions FB page notifications, recent posts, and their engagement
 * Run: node scripts/checkFbNotifications.mjs
 */
import "dotenv/config";

const PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const API = "https://graph.facebook.com/v25.0";

if (!PAGE_ID || !TOKEN) {
  console.error("❌ FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN not set in environment");
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

// 1. Page info + fan count
console.log("\n═══════════════════════════════════════════════");
console.log("  ZTV PRODUCTIONS — FACEBOOK PAGE HEALTH CHECK");
console.log("═══════════════════════════════════════════════\n");

const pageInfo = await fbGet(`/${PAGE_ID}`, {
  fields: "name,fan_count,followers_count,category,verification_status,engagement",
});
if (pageInfo.error) {
  console.error("❌ Page info error:", pageInfo.error.message);
  console.error("   This likely means the Page Access Token has expired.");
  console.error("   Generate a new long-lived token at: https://developers.facebook.com/tools/explorer");
  process.exit(1);
}
console.log(`📄 Page: ${pageInfo.name}`);
console.log(`👥 Fans: ${pageInfo.fan_count?.toLocaleString()}`);
console.log(`👁️  Followers: ${pageInfo.followers_count?.toLocaleString()}`);
console.log(`✅ Verified: ${pageInfo.verification_status}`);
console.log(`📊 Engagement: ${JSON.stringify(pageInfo.engagement)}`);

// 2. Recent posts with engagement metrics
console.log("\n─── RECENT POSTS (last 10) ─────────────────────\n");
const posts = await fbGet(`/${PAGE_ID}/posts`, {
  fields: "message,story,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares",
  limit: "10",
});

if (posts.error) {
  console.error("❌ Posts error:", posts.error.message);
} else {
  const items = posts.data || [];
  if (items.length === 0) {
    console.log("No posts found.");
  } else {
    for (const post of items) {
      const reactions = post.reactions?.summary?.total_count ?? 0;
      const comments = post.comments?.summary?.total_count ?? 0;
      const shares = post.shares?.count ?? 0;
      const msg = (post.message || post.story || "(no text)").slice(0, 80).replace(/\n/g, " ");
      const date = new Date(post.created_time).toLocaleString("en-US", {
        timeZone: "America/Phoenix",
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      console.log(`📅 ${date}`);
      console.log(`   "${msg}..."`);
      console.log(`   ❤️  ${reactions} reactions  💬 ${comments} comments  🔁 ${shares} shares`);
      if (post.permalink_url) console.log(`   🔗 ${post.permalink_url}`);
      console.log();
    }
  }
}

// 3. Page notifications (requires manage_pages permission)
console.log("─── PAGE NOTIFICATIONS ─────────────────────────\n");
const notifs = await fbGet(`/${PAGE_ID}/notifications`, {
  fields: "title,message,created_time,link,object",
  limit: "20",
});

if (notifs.error) {
  console.log(`⚠️  Notifications not accessible: ${notifs.error.message}`);
  console.log("   (Requires 'pages_manage_metadata' permission on the token)");
} else {
  const items = notifs.data || [];
  if (items.length === 0) {
    console.log("No notifications found.");
  } else {
    for (const n of items.slice(0, 15)) {
      const date = new Date(n.created_time).toLocaleString("en-US", {
        timeZone: "America/Phoenix",
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      console.log(`🔔 [${date}] ${n.title || n.message || "(no title)"}`);
      if (n.link) console.log(`   🔗 ${n.link}`);
    }
  }
}

// 4. Insights — reach and impressions for recent posts
console.log("\n─── PAGE INSIGHTS (last 7 days) ────────────────\n");
const insights = await fbGet(`/${PAGE_ID}/insights`, {
  metric: "page_impressions,page_reach,page_engaged_users,page_fan_adds",
  period: "week",
  date_preset: "last_7_days",
});

if (insights.error) {
  console.log(`⚠️  Insights not accessible: ${insights.error.message}`);
} else {
  for (const metric of (insights.data || [])) {
    const val = metric.values?.[metric.values.length - 1]?.value ?? "N/A";
    console.log(`📈 ${metric.name}: ${typeof val === "object" ? JSON.stringify(val) : val}`);
  }
}

console.log("\n═══════════════════════════════════════════════\n");
