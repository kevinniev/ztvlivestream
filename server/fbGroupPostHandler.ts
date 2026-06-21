/**
 * Facebook Group Posting Automation
 * Posts ZTVLIVE content to confirmed member groups twice a week
 * 
 * Confirmed Groups (ZTV Productions is a member):
 * - Black TV & Entertainment (758493860430561) — 54.8K members
 * - Cord Cutters Community (595635221254500) — 3.7K members
 * - Female Barbers (262942523817550) — 31.8K members
 * - Barber Community (1663034861046514) — 57.0K members
 * - The Barber's Business — via sidebar link
 * - Black T.V. Shows, Movies, Music, and Entertainment — via sidebar link
 * - Streaming & Cord Cutting Help Desk — via sidebar link
 * - Hampton Roads Barbers/hairstylist/MUA — via sidebar link
 */

import express from "express";

const router = express.Router();

// ─── Group Registry ────────────────────────────────────────────────────────────
const FB_GROUPS = {
  blackTvEntertainment: {
    id: "758493860430561",
    name: "Black TV & Entertainment",
    members: "54.8K",
    topics: ["black_entertainment", "music", "celebrity", "bet_awards", "streaming"],
  },
  cordCutters: {
    id: "595635221254500",
    name: "Cord Cutters Community",
    members: "3.7K",
    topics: ["streaming", "cord_cutting", "free_tv", "roku", "fire_tv"],
  },
  femaleBarbers: {
    id: "262942523817550",
    name: "Female Barbers",
    members: "31.8K",
    topics: ["barber", "female_barber", "community_cut", "grooming", "beauty"],
  },
  barberCommunity: {
    id: "1663034861046514",
    name: "Barber Community",
    members: "57.0K",
    topics: ["barber", "community_cut", "grooming", "haircut", "barbershop"],
  },
};

// ─── Content Templates by Topic ────────────────────────────────────────────────
const CONTENT_TEMPLATES = {
  black_entertainment: [
    {
      message: `🎬 ZTV LIVE is your home for Black entertainment 24/7 — FREE with no subscription needed.\n\nFrom BET Award coverage to independent Black films, documentaries, and live events — we stream it all.\n\n📺 Watch now: https://ztvlivestream.com\n\nWhat Black show or artist do you want to see more of? Drop it below 👇`,
      engagementHook: "What Black show or artist do you want to see more of?",
    },
    {
      message: `🏆 Who's watching the BET Awards this Sunday June 28?\n\nZTV LIVE will have full coverage, reactions, and highlights — completely FREE to stream.\n\nCardi B, Doechii, Lil Wayne, GloRilla, Tems, and Druski hosting — this is going to be EPIC 🔥\n\n📺 Stream free: https://ztvlivestream.com\n\nDrop your Album of the Year prediction below 👇 Cardi B? J. Cole? Tyler? Bruno Mars?`,
      engagementHook: "Who's your Album of the Year pick?",
    },
    {
      message: `📣 Black-owned streaming is here.\n\nZTV LIVE is a 24/7 free streaming platform built for and by the Black community. No cable. No subscription. Just great content.\n\n🎵 Music | 🎬 Films | 📺 Live TV | 🎤 Interviews\n\nWatch free at https://ztvlivestream.com\n\nTag someone who needs to discover this 👇`,
      engagementHook: "Tag someone who needs to discover this",
    },
  ],
  streaming: [
    {
      message: `📺 Did you know you can watch FREE live TV 24/7 without cable or a subscription?\n\nZTV LIVE streams Black entertainment, music, films, and live events completely free — no credit card, no signup required.\n\n🔗 https://ztvlivestream.com\n\nWhat streaming service are you using right now? Drop it below 👇`,
      engagementHook: "What streaming service are you using right now?",
    },
    {
      message: `🚫 Tired of paying $15-$80/month for streaming services?\n\nZTV LIVE is 100% FREE — live TV, on-demand content, music, and more. No subscription. No credit card.\n\nWe're building the Netflix of Black entertainment — and it's FREE.\n\n📺 Watch now: https://ztvlivestream.com\n\nWhat's the most you've ever paid for streaming? 👇`,
      engagementHook: "What's the most you've ever paid for streaming?",
    },
  ],
  barber: [
    {
      message: `✂️ BARBERS — ZTV LIVE wants to feature YOUR work.\n\nWe're building a platform that puts barbers in front of thousands of viewers. CommunityCut is our show dedicated to the craft, the culture, and the business of barbering.\n\n💈 Get featured: https://ztvlivestream.com/become-a-creator\n\nWhat's the most creative cut you've ever done? Show us below 👇`,
      engagementHook: "What's the most creative cut you've ever done?",
    },
    {
      message: `💈 The barbershop is more than a haircut — it's community.\n\nZTV LIVE's CommunityCut series celebrates barbers, their stories, and the culture they build. Watch free and see if your city is represented.\n\n📺 https://ztvlivestream.com\n\nWhere are you cutting from? Drop your city below 👇`,
      engagementHook: "Where are you cutting from? Drop your city",
    },
    {
      message: `✂️ Female barbers are changing the game — and ZTV LIVE is here for it.\n\nWe're looking for talented female barbers to feature on CommunityCut. No experience with TV needed — just your skill and your story.\n\n🎬 Apply: https://ztvlivestream.com/become-a-creator\n\nHow long have you been cutting? Drop your years below 👇`,
      engagementHook: "How long have you been cutting?",
    },
  ],
  cord_cutting: [
    {
      message: `📡 Cut the cord and never look back.\n\nZTV LIVE gives you free 24/7 live TV streaming — Black entertainment, music, news, and more. Works on any device: phone, tablet, smart TV, Roku, Fire TV.\n\n🔗 https://ztvlivestream.com\n\nHow long ago did you cut the cord? 👇`,
      engagementHook: "How long ago did you cut the cord?",
    },
    {
      message: `🆓 FREE streaming alert for cord cutters!\n\nZTV LIVE is a 24/7 free live streaming platform — no subscription, no credit card, no cable box needed.\n\nPerfect for anyone who's already cut the cord and wants more free content options.\n\n📺 Watch free: https://ztvlivestream.com\n\nWhat's your current free TV setup? Antenna? Pluto? Tubi? Tell us below 👇`,
      engagementHook: "What's your current free TV setup?",
    },
  ],
};

// ─── Helper: Get content for a group ───────────────────────────────────────────
function getContentForGroup(groupKey: keyof typeof FB_GROUPS, rotationIndex: number) {
  const group = FB_GROUPS[groupKey];
  const primaryTopic = group.topics[0] as keyof typeof CONTENT_TEMPLATES;
  const templates = CONTENT_TEMPLATES[primaryTopic] || CONTENT_TEMPLATES.streaming;
  const template = templates[rotationIndex % templates.length];
  return template;
}

// ─── Helper: Post to a single FB group ─────────────────────────────────────────
async function postToFbGroup(groupId: string, message: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    return { success: false, error: "FB_PAGE_ACCESS_TOKEN not set" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${groupId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          access_token: token,
        }),
      }
    );

    const data = await response.json() as { id?: string; error?: { message: string; code: number } };

    if (data.error) {
      console.error(`[FB Group Post] Error posting to group ${groupId}:`, data.error);
      return { success: false, error: data.error.message };
    }

    console.log(`[FB Group Post] ✅ Posted to group ${groupId}: ${data.id}`);
    return { success: true, postId: data.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error(`[FB Group Post] Network error posting to group ${groupId}:`, error);
    return { success: false, error };
  }
}

// ─── Main: Post to all groups for a given topic category ───────────────────────
async function postToAllGroups(category: "entertainment" | "barber" | "streaming", rotationIndex: number) {
  const results: Array<{ group: string; success: boolean; postId?: string; error?: string }> = [];

  // Stagger posts by 2 minutes each to avoid spam detection
  const groupsToPost: Array<{ key: keyof typeof FB_GROUPS; delay: number }> = [];

  if (category === "entertainment") {
    groupsToPost.push(
      { key: "blackTvEntertainment", delay: 0 },
      { key: "cordCutters", delay: 120000 }, // 2 min delay
    );
  } else if (category === "barber") {
    groupsToPost.push(
      { key: "barberCommunity", delay: 0 },
      { key: "femaleBarbers", delay: 120000 }, // 2 min delay
    );
  } else if (category === "streaming") {
    groupsToPost.push(
      { key: "cordCutters", delay: 0 },
      { key: "blackTvEntertainment", delay: 120000 },
    );
  }

  for (const { key, delay } of groupsToPost) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const content = getContentForGroup(key, rotationIndex);
    const result = await postToFbGroup(FB_GROUPS[key].id, content.message);
    results.push({ group: FB_GROUPS[key].name, ...result });
  }

  return results;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/fb-groups/post-entertainment
 * Post Black entertainment content to relevant groups
 */
router.post("/post-entertainment", async (req, res) => {
  const rotationIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3)); // Rotates every 3 days
  const results = await postToAllGroups("entertainment", rotationIndex);
  const successCount = results.filter((r) => r.success).length;
  res.json({
    success: successCount > 0,
    message: `Posted to ${successCount}/${results.length} groups`,
    results,
  });
});

/**
 * POST /api/fb-groups/post-barber
 * Post barber/CommunityCut content to barber groups
 */
router.post("/post-barber", async (req, res) => {
  const rotationIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3));
  const results = await postToAllGroups("barber", rotationIndex);
  const successCount = results.filter((r) => r.success).length;
  res.json({
    success: successCount > 0,
    message: `Posted to ${successCount}/${results.length} groups`,
    results,
  });
});

/**
 * POST /api/fb-groups/post-streaming
 * Post cord-cutting / free streaming content
 */
router.post("/post-streaming", async (req, res) => {
  const rotationIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3));
  const results = await postToAllGroups("streaming", rotationIndex);
  const successCount = results.filter((r) => r.success).length;
  res.json({
    success: successCount > 0,
    message: `Posted to ${successCount}/${results.length} groups`,
    results,
  });
});

/**
 * POST /api/fb-groups/post-all
 * Heartbeat endpoint — posts to ALL groups (called by scheduler)
 * Alternates: Tuesday = entertainment, Friday = barber
 */
router.post("/post-all", async (req, res) => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 2=Tue, 5=Fri
  const rotationIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3));

  // Tuesday (2) → entertainment + streaming
  // Friday (5) → barber + entertainment
  // Other days (manual trigger) → all categories
  let category: "entertainment" | "barber" | "streaming";
  if (dayOfWeek === 5) {
    category = "barber";
  } else {
    category = "entertainment";
  }

  const results = await postToAllGroups(category, rotationIndex);
  const successCount = results.filter((r) => r.success).length;

  console.log(`[FB Groups Scheduler] ${now.toISOString()} — Posted ${successCount}/${results.length} groups (${category})`);

  res.json({
    success: successCount > 0,
    category,
    message: `Scheduled post: ${successCount}/${results.length} groups succeeded`,
    results,
    timestamp: now.toISOString(),
  });
});

/**
 * GET /api/fb-groups/status
 * Check group list and token status
 */
router.get("/status", async (_req, res) => {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const hasToken = !!token && token.length > 20;

  res.json({
    hasToken,
    tokenPreview: hasToken ? `${token!.substring(0, 12)}...` : "NOT SET",
    groups: Object.entries(FB_GROUPS).map(([key, g]) => ({
      key,
      name: g.name,
      id: g.id,
      members: g.members,
      topics: g.topics,
    })),
    schedule: {
      tuesday: "Entertainment + Streaming posts (10am MST)",
      friday: "Barber + CommunityCut posts (10am MST)",
    },
  });
});

export default router;
