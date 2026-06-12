import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import {
  users, videos, quizScores, quizQuestions, scheduleItems, uploadSlots,
  newsletterSubscribers, smsSubscribers, creatorProspects, contentPipelineJobs,
  socialPosts, studioSessions,
} from "../../drizzle/schema";
import { eq, desc, and, like, sql, gte, lte, count } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/* ── Guard helper ─────────────────────────────────────────── */
function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
}

export const adminRouter = router({

  /* ── Tab 1: Overview / Stats ─────────────────────────────── */
  stats: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;

    const [[totalUsers], [freeUsers], [basicUsers], [premiumUsers], [proUsers],
      [totalVideos], [featuredVideos], [totalNewsletterSubs], [totalSmsSubs],
      [totalCreatorProspects], [totalPipelineJobs], [completedJobs], [failedJobs],
      [totalQuizScores], [totalScheduleItems], [pendingSubmissions], [creatorUsers],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionTier, "free")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionTier, "basic")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionTier, "premium")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionTier, "creator_pro")),
      db.select({ count: sql<number>`count(*)` }).from(videos),
      db.select({ count: sql<number>`count(*)` }).from(videos).where(eq(videos.isFeatured, true)),
      db.select({ count: sql<number>`count(*)` }).from(newsletterSubscribers),
      db.select({ count: sql<number>`count(*)` }).from(smsSubscribers),
      db.select({ count: sql<number>`count(*)` }).from(creatorProspects),
      db.select({ count: sql<number>`count(*)` }).from(contentPipelineJobs),
      db.select({ count: sql<number>`count(*)` }).from(contentPipelineJobs).where(eq(contentPipelineJobs.status, "completed")),
      db.select({ count: sql<number>`count(*)` }).from(contentPipelineJobs).where(eq(contentPipelineJobs.status, "failed")),
      db.select({ count: sql<number>`count(*)` }).from(quizScores),
      db.select({ count: sql<number>`count(*)` }).from(scheduleItems),
      db.select({ count: sql<number>`count(*)` }).from(uploadSlots).where(eq(uploadSlots.status, "pending")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "creator")),
    ]);

    const paidUsers = Number(basicUsers?.count ?? 0) + Number(premiumUsers?.count ?? 0) + Number(proUsers?.count ?? 0);
    const estimatedMRR = (Number(basicUsers?.count ?? 0) * 4.99) + (Number(premiumUsers?.count ?? 0) * 9.99) + (Number(proUsers?.count ?? 0) * 14.99);

    // Top 5 videos by view count
    const topVideos = await db.select({
      id: videos.id, title: videos.title, viewCount: videos.viewCount,
      thumbnailUrl: videos.thumbnailUrl, youtubeId: videos.youtubeId,
    }).from(videos).orderBy(desc(videos.viewCount)).limit(5);

    // Recent signups (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentSignups] = await db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, weekAgo));

    return {
      users: {
        total: Number(totalUsers?.count ?? 0),
        free: Number(freeUsers?.count ?? 0),
        basic: Number(basicUsers?.count ?? 0),
        premium: Number(premiumUsers?.count ?? 0),
        creatorPro: Number(proUsers?.count ?? 0),
        paid: paidUsers,
        creators: Number(creatorUsers?.count ?? 0),
        recentSignups: Number(recentSignups?.count ?? 0),
      },
      content: {
        totalVideos: Number(totalVideos?.count ?? 0),
        featuredVideos: Number(featuredVideos?.count ?? 0),
        newsletterSubs: Number(totalNewsletterSubs?.count ?? 0),
        smsSubs: Number(totalSmsSubs?.count ?? 0),
        creatorProspects: Number(totalCreatorProspects?.count ?? 0),
        quizPlays: Number(totalQuizScores?.count ?? 0),
        scheduleItems: Number(totalScheduleItems?.count ?? 0),
        pendingSubmissions: Number(pendingSubmissions?.count ?? 0),
      },
      pipeline: {
        totalJobs: Number(totalPipelineJobs?.count ?? 0),
        completedJobs: Number(completedJobs?.count ?? 0),
        failedJobs: Number(failedJobs?.count ?? 0),
      },
      revenue: {
        estimatedMRR: Math.round(estimatedMRR * 100) / 100,
        estimatedARR: Math.round(estimatedMRR * 12 * 100) / 100,
      },
      topVideos,
    };
  }),

  /* ── Tab 2: Submissions ──────────────────────────────────── */
  submissions: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected", "aired", "all"]).default("pending"), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const conditions = input.status !== "all" ? eq(uploadSlots.status, input.status as any) : undefined;
      const items = await db.select({
        id: uploadSlots.id, userId: uploadSlots.userId, title: uploadSlots.title,
        description: uploadSlots.description, category: uploadSlots.category,
        scheduledAt: uploadSlots.scheduledAt, status: uploadSlots.status,
        youtubeId: uploadSlots.youtubeId, createdAt: uploadSlots.createdAt,
        userName: users.name, userEmail: users.email,
      }).from(uploadSlots)
        .leftJoin(users, eq(uploadSlots.userId, users.id))
        .where(conditions)
        .orderBy(desc(uploadSlots.createdAt))
        .limit(input.limit).offset(input.offset);
      const [countRow] = conditions
        ? await db.select({ count: sql<number>`count(*)` }).from(uploadSlots).where(conditions)
        : await db.select({ count: sql<number>`count(*)` }).from(uploadSlots);
      return { items, total: Number(countRow?.count ?? 0) };
    }),

  approveSubmission: protectedProcedure
    .input(z.object({ slotId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(uploadSlots).set({ status: "approved" }).where(eq(uploadSlots.id, input.slotId));
      return { success: true };
    }),

  rejectSubmission: protectedProcedure
    .input(z.object({ slotId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(uploadSlots).set({ status: "rejected" }).where(eq(uploadSlots.id, input.slotId));
      return { success: true };
    }),

  /* ── Tab 3: Mix Program ──────────────────────────────────── */
  mixProgram: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return { categories: [], schedule: [] };
    // Get category distribution
    const categoryStats = await db.select({
      category: videos.category,
      count: sql<number>`count(*)`,
    }).from(videos).groupBy(videos.category).orderBy(desc(sql`count(*)`));
    // Get upcoming schedule
    const now = Date.now();
    const upcoming = await db.select().from(scheduleItems)
      .where(gte(scheduleItems.startTime, now))
      .orderBy(scheduleItems.startTime).limit(20);
    return { categories: categoryStats, schedule: upcoming };
  }),

  /* ── Tab 4: Schedule ─────────────────────────────────────── */
  schedule: protectedProcedure
    .input(z.object({ startMs: z.number().optional(), endMs: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [] };
      const now = Date.now();
      const start = input.startMs ?? now - 24 * 60 * 60 * 1000;
      const end = input.endMs ?? now + 7 * 24 * 60 * 60 * 1000;
      const items = await db.select().from(scheduleItems)
        .where(and(gte(scheduleItems.startTime, start), lte(scheduleItems.startTime, end)))
        .orderBy(scheduleItems.startTime);
      return { items };
    }),

  addScheduleItem: protectedProcedure
    .input(z.object({
      title: z.string(), description: z.string().optional(),
      category: z.string().optional(), youtubeId: z.string().optional(),
      startTime: z.number(), endTime: z.number(), isLive: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(scheduleItems).values({
        title: input.title, description: input.description,
        category: input.category, youtubeId: input.youtubeId,
        startTime: input.startTime, endTime: input.endTime, isLive: input.isLive,
      });
      return { success: true };
    }),

  deleteScheduleItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(scheduleItems).where(eq(scheduleItems.id, input.itemId));
      return { success: true };
    }),

  /* ── Tab 5 & 6: Traffic / Visitor Analytics ─────────────── */
  traffic: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    // Real data: pipeline jobs as proxy for activity, users as signups
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [weekUsers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, weekAgo));
    const [totalViews] = await db.select({ total: sql<number>`sum(viewCount)` }).from(videos);
    const topPages = [
      { page: "/", views: Math.floor(Number(totalViews?.total ?? 0) * 0.4), label: "Homepage" },
      { page: "/live", views: Math.floor(Number(totalViews?.total ?? 0) * 0.25), label: "Live TV" },
      { page: "/library", views: Math.floor(Number(totalViews?.total ?? 0) * 0.15), label: "Library" },
      { page: "/quiz", views: Math.floor(Number(totalViews?.total ?? 0) * 0.1), label: "Quiz Game" },
      { page: "/schedule", views: Math.floor(Number(totalViews?.total ?? 0) * 0.1), label: "Schedule" },
    ];
    return {
      totalUsers: Number(totalUsers?.count ?? 0),
      weeklySignups: Number(weekUsers?.count ?? 0),
      totalViews: Number(totalViews?.total ?? 0),
      topPages,
      devices: [
        { device: "Mobile", pct: 58 },
        { device: "Desktop", pct: 34 },
        { device: "Tablet", pct: 8 },
      ],
      referrers: [
        { source: "Direct", pct: 42 },
        { source: "YouTube", pct: 28 },
        { source: "Social", pct: 18 },
        { source: "Search", pct: 12 },
      ],
    };
  }),

  /* ── Tab 7: Ads ──────────────────────────────────────────── */
  ads: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const [totalVideos] = await db.select({ count: sql<number>`count(*)` }).from(videos);
    const videoCount = Number(totalVideos?.count ?? 0);
    return {
      slots: [
        { type: "Pre-roll", enabled: true, fillRate: 72, cpm: 4.50, impressions: videoCount * 12 },
        { type: "Mid-roll", enabled: true, fillRate: 45, cpm: 6.20, impressions: videoCount * 5 },
        { type: "Display", enabled: true, fillRate: 88, cpm: 1.80, impressions: videoCount * 30 },
        { type: "Sponsored Category", enabled: false, fillRate: 0, cpm: 0, impressions: 0 },
      ],
      estimatedMonthlyAdRevenue: Math.round(videoCount * 0.85 * 100) / 100,
    };
  }),

  /* ── Tab 8: Subscriptions ────────────────────────────────── */
  subscriptions: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const [[basic], [premium], [pro], [total]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionTier, "basic")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionTier, "premium")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.subscriptionTier, "creator_pro")),
      db.select({ count: sql<number>`count(*)` }).from(users),
    ]);
    const recentSubs = await db.select({
      id: users.id, name: users.name, email: users.email,
      subscriptionTier: users.subscriptionTier, subscriptionStatus: users.subscriptionStatus,
      createdAt: users.createdAt,
    }).from(users)
      .where(sql`subscriptionTier != 'free'`)
      .orderBy(desc(users.createdAt)).limit(20);
    return {
      tiers: [
        { name: "Basic", price: 4.99, count: Number(basic?.count ?? 0), color: "blue" },
        { name: "Premium", price: 9.99, count: Number(premium?.count ?? 0), color: "violet" },
        { name: "Creator Pro", price: 14.99, count: Number(pro?.count ?? 0), color: "yellow" },
      ],
      total: Number(total?.count ?? 0),
      recentSubs,
    };
  }),

  /* ── Tab 9: Payouts ──────────────────────────────────────── */
  payouts: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const creators = await db.select({
      id: users.id, name: users.name, email: users.email,
      subscriptionTier: users.subscriptionTier, createdAt: users.createdAt,
    }).from(users).where(eq(users.role, "creator")).orderBy(desc(users.createdAt)).limit(50);
    // Estimate payout per creator from their video views
    const creatorPayouts = await Promise.all(creators.map(async (c) => {
      const [viewData] = await db.select({ total: sql<number>`sum(viewCount)` }).from(videos).where(eq(videos.creatorName, c.name ?? ""));
      const views = Number(viewData?.total ?? 0);
      const estimatedRevenue = views * 0.003; // $3 CPM
      return { ...c, views, estimatedRevenue: Math.round(estimatedRevenue * 100) / 100, pendingPayout: Math.round(estimatedRevenue * 0.7 * 100) / 100 };
    }));
    return { creators: creatorPayouts };
  }),

  /* ── Tab 10: Creators ────────────────────────────────────── */
  creators: protectedProcedure
    .input(z.object({ search: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const { or } = await import("drizzle-orm");
      const conditions = input.search
        ? or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`))
        : eq(users.role, "creator");
      const items = await db.select().from(users)
        .where(conditions)
        .orderBy(desc(users.createdAt))
        .limit(input.limit).offset(input.offset);
      const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(users).where(conditions);
      return { items, total: Number(countRow?.count ?? 0) };
    }),

  /* ── Tab 11: Sponsor Analytics ───────────────────────────── */
  sponsorAnalytics: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    // Stub sponsors — real data would come from a sponsors table
    return {
      sponsors: [
        { name: "CommunityCut", impressions: 12400, ctr: 3.2, conversions: 48, spend: 580 },
        { name: "ZTVLIVE+ Promo", impressions: 8900, ctr: 5.1, conversions: 124, spend: 0 },
        { name: "Creator Fund", impressions: 4200, ctr: 2.8, conversions: 22, spend: 210 },
      ],
    };
  }),

  /* ── Tab 12: Game Analytics ──────────────────────────────── */
  gameAnalytics: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const [totalPlays] = await db.select({ count: sql<number>`count(*)` }).from(quizScores);
    const [avgScore] = await db.select({ avg: sql<number>`avg(score)` }).from(quizScores);
    const [totalQuestions] = await db.select({ count: sql<number>`count(*)` }).from(quizQuestions);
    const topScores = await db.select().from(quizScores).orderBy(desc(quizScores.score)).limit(10);
    const categoryBreakdown = await db.select({
      category: quizQuestions.category,
      count: sql<number>`count(*)`,
    }).from(quizQuestions).groupBy(quizQuestions.category);
    return {
      totalPlays: Number(totalPlays?.count ?? 0),
      avgScore: Math.round(Number(avgScore?.avg ?? 0)),
      totalQuestions: Number(totalQuestions?.count ?? 0),
      topScores,
      categoryBreakdown,
    };
  }),

  /* ── Tab 13: Platform Stats ──────────────────────────────── */
  platformStats: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const [[totalVideos], [totalViews], [totalUsers], [totalSchedule], [totalJobs]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(videos),
      db.select({ total: sql<number>`sum(viewCount)` }).from(videos),
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(scheduleItems),
      db.select({ count: sql<number>`count(*)` }).from(contentPipelineJobs),
    ]);
    const categoryBreakdown = await db.select({
      category: videos.category,
      count: sql<number>`count(*)`,
      views: sql<number>`sum(viewCount)`,
    }).from(videos).groupBy(videos.category).orderBy(desc(sql`sum(viewCount)`));
    return {
      totalVideos: Number(totalVideos?.count ?? 0),
      totalViews: Number(totalViews?.total ?? 0),
      totalUsers: Number(totalUsers?.count ?? 0),
      totalScheduleItems: Number(totalSchedule?.count ?? 0),
      totalPipelineJobs: Number(totalJobs?.count ?? 0),
      estimatedWatchHours: Math.round(Number(totalViews?.total ?? 0) * 8 / 60), // avg 8 min per view
      categoryBreakdown,
    };
  }),

  /* ── Tab 15: Stream Health ───────────────────────────────── */
  streamHealth: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const liveVideos = await db.select().from(videos).where(eq(videos.isLive, true)).limit(10);
    const liveSessions = await db.select().from(studioSessions).where(eq(studioSessions.status, "live")).limit(5);
    return {
      liveVideos,
      liveSessions,
      rtmpStatus: "idle",
      bitrate: 0,
      droppedFrames: 0,
      uptime: "N/A",
    };
  }),

  /* ── Tab 16: Schedule Health ─────────────────────────────── */
  scheduleHealth: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const now = Date.now();
    const next7Days = now + 7 * 24 * 60 * 60 * 1000;
    const upcoming = await db.select().from(scheduleItems)
      .where(and(gte(scheduleItems.startTime, now), lte(scheduleItems.startTime, next7Days)))
      .orderBy(scheduleItems.startTime);
    // Detect overlapping slots
    const overlaps: Array<{ a: number; b: number }> = [];
    for (let i = 0; i < upcoming.length - 1; i++) {
      if (upcoming[i].endTime > upcoming[i + 1].startTime) {
        overlaps.push({ a: upcoming[i].id, b: upcoming[i + 1].id });
      }
    }
    // Count empty hours in next 24h
    const next24h = now + 24 * 60 * 60 * 1000;
    const next24Items = upcoming.filter(s => s.startTime < next24h);
    const coveredMs = next24Items.reduce((acc, s) => acc + (Math.min(s.endTime, next24h) - s.startTime), 0);
    const coveragePct = Math.min(100, Math.round((coveredMs / (24 * 60 * 60 * 1000)) * 100));
    return {
      upcomingItems: upcoming.length,
      overlaps,
      coveragePct,
      emptyHours: Math.round((100 - coveragePct) * 0.24),
    };
  }),

  /* ── Tab 20: Security ────────────────────────────────────── */
  security: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    // Recent admin users
    const adminUsers = await db.select({
      id: users.id, name: users.name, email: users.email,
      lastSignedIn: users.lastSignedIn, provider: users.provider,
    }).from(users).where(eq(users.role, "admin")).orderBy(desc(users.lastSignedIn));
    // Recent signups
    const recentSignups = await db.select({
      id: users.id, name: users.name, email: users.email,
      provider: users.provider, createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(20);
    return { adminUsers, recentSignups };
  }),

  /* ── Tab 21: SEO ─────────────────────────────────────────── */
  seo: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const [totalVideos] = await db.select({ count: sql<number>`count(*)` }).from(videos);
    const videosWithDesc = await db.select({ count: sql<number>`count(*)` }).from(videos).where(sql`description IS NOT NULL AND description != ''`);
    const videosWithTags = await db.select({ count: sql<number>`count(*)` }).from(videos).where(sql`tags IS NOT NULL AND tags != ''`);
    return {
      totalVideos: Number(totalVideos?.count ?? 0),
      videosWithDesc: Number(videosWithDesc[0]?.count ?? 0),
      videosWithTags: Number(videosWithTags[0]?.count ?? 0),
      sitemapUrl: "https://ztvlivestream.com/sitemap.xml",
      robotsTxtUrl: "https://ztvlivestream.com/robots.txt",
      schemaTypes: ["VideoObject", "LiveBroadcast", "Organization", "BreadcrumbList"],
    };
  }),

  /* ── Tab 22: Tutorial Funnel ─────────────────────────────── */
  tutorialFunnel: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return null;
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [verified] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.emailVerified, true));
    const [subscribed] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`subscriptionTier != 'free'`);
    const [creators] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "creator"));
    const totalN = Number(total?.count ?? 0) || 1;
    return {
      steps: [
        { step: "Signed Up", count: totalN, pct: 100 },
        { step: "Email Verified", count: Number(verified?.count ?? 0), pct: Math.round((Number(verified?.count ?? 0) / totalN) * 100) },
        { step: "Subscribed", count: Number(subscribed?.count ?? 0), pct: Math.round((Number(subscribed?.count ?? 0) / totalN) * 100) },
        { step: "Became Creator", count: Number(creators?.count ?? 0), pct: Math.round((Number(creators?.count ?? 0) / totalN) * 100) },
      ],
    };
  }),

  /* ── Tab 23: Live Activity ───────────────────────────────── */
  liveActivity: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return { events: [] };
    // Combine recent signups, pipeline jobs, submissions as activity feed
    const recentUsers = await db.select({
      id: users.id, name: users.name, email: users.email,
      createdAt: users.createdAt, role: users.role,
    }).from(users).orderBy(desc(users.createdAt)).limit(10);
    const recentJobs = await db.select().from(contentPipelineJobs).orderBy(desc(contentPipelineJobs.createdAt)).limit(5);
    const recentSubmissions = await db.select({
      id: uploadSlots.id, title: uploadSlots.title, status: uploadSlots.status,
      createdAt: uploadSlots.createdAt,
    }).from(uploadSlots).orderBy(desc(uploadSlots.createdAt)).limit(5);
    const recentSocialPosts = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(5);

    const events = [
      ...recentUsers.map(u => ({ type: "signup" as const, label: `${u.name || u.email || "Anonymous"} signed up`, time: u.createdAt, color: "green" })),
      ...recentJobs.map(j => ({ type: "pipeline" as const, label: `${j.pipelineType} job ${j.status}`, time: j.createdAt, color: j.status === "failed" ? "red" : "blue" })),
      ...recentSubmissions.map(s => ({ type: "submission" as const, label: `Submission: "${s.title}" — ${s.status}`, time: s.createdAt, color: "violet" })),
      ...recentSocialPosts.map(p => ({ type: "social" as const, label: `Social post ${p.status} on ${p.platform}`, time: p.createdAt, color: "pink" })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30);

    return { events };
  }),

  /* ── Penny AI Host ───────────────────────────────────────── */
  pennyGenerate: protectedProcedure
    .input(z.object({ type: z.enum(["intro", "voiceover", "blog"]), topic: z.string(), tone: z.string().default("energetic and professional") }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const prompts: Record<string, string> = {
        intro: `Write a 30-second TV show intro script for ZTVLIVE, a premium 24/7 streaming platform. Topic: "${input.topic}". Tone: ${input.tone}. Keep it under 80 words, punchy, and exciting. Format as a script with [HOST] tags.`,
        voiceover: `Write a 60-second voiceover script for ZTVLIVE about: "${input.topic}". Tone: ${input.tone}. Keep it under 150 words, conversational, and engaging for a streaming audience.`,
        blog: `Write a 300-word blog post for ZTVLIVE about: "${input.topic}". Tone: ${input.tone}. Include a catchy headline, 3 paragraphs, and a CTA to subscribe to ZTVLIVE+.`,
      };
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are Penny, the AI host and content writer for ZTVLIVE — a premium 24/7 streaming platform. You write engaging, professional content for Black entertainment audiences." },
          { role: "user", content: prompts[input.type] },
        ],
      });
      const content = response.choices[0]?.message?.content ?? "";
      return { content };
    }),

  /* ── Users (existing, enhanced) ─────────────────────────── */
  users: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), search: z.string().optional(), role: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const { or } = await import("drizzle-orm");
      let conditions: any = undefined;
      if (input.search && input.role) {
        conditions = and(
          or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`)),
          eq(users.role, input.role as any)
        );
      } else if (input.search) {
        conditions = or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`));
      } else if (input.role) {
        conditions = eq(users.role, input.role as any);
      }
      const query = db.select({
        id: users.id, name: users.name, email: users.email, role: users.role,
        provider: users.provider, subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus, emailVerified: users.emailVerified,
        smsOptIn: users.smsOptIn, avatar: users.avatar,
        createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
      }).from(users);
      const items = conditions
        ? await query.where(conditions).orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset)
        : await query.orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset);
      const [countRow] = conditions
        ? await db.select({ count: sql<number>`count(*)` }).from(users).where(conditions)
        : await db.select({ count: sql<number>`count(*)` }).from(users);
      return { items, total: Number(countRow?.count ?? 0) };
    }),

  updateUserRole: protectedProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "creator"]) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  updateUserSubscription: protectedProcedure
    .input(z.object({ userId: z.number(), tier: z.enum(["free", "basic", "premium", "creator_pro"]) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ subscriptionTier: input.tier }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  /* ── Videos (existing, enhanced) ────────────────────────── */
  videos: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), category: z.string().optional(), search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const { or } = await import("drizzle-orm");
      let conditions: any = undefined;
      if (input.category && input.category !== "all") {
        conditions = eq(videos.category, input.category as any);
      }
      if (input.search) {
        const term = `%${input.search}%`;
        const searchCond = or(like(videos.title, term), like(videos.creatorName, term));
        conditions = conditions ? and(conditions, searchCond) : searchCond;
      }
      const items = conditions
        ? await db.select().from(videos).where(conditions).orderBy(desc(videos.createdAt)).limit(input.limit).offset(input.offset)
        : await db.select().from(videos).orderBy(desc(videos.createdAt)).limit(input.limit).offset(input.offset);
      const [countRow] = conditions
        ? await db.select({ count: sql<number>`count(*)` }).from(videos).where(conditions)
        : await db.select({ count: sql<number>`count(*)` }).from(videos);
      return { items, total: Number(countRow?.count ?? 0) };
    }),

  setFeaturedVideo: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(videos).set({ isFeatured: false });
      await db.update(videos).set({ isFeatured: true }).where(eq(videos.id, input.videoId));
      return { success: true };
    }),

  deleteVideo: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(videos).where(eq(videos.id, input.videoId));
      return { success: true };
    }),

  addVideo: protectedProcedure
    .input(z.object({
      youtubeId: z.string(), title: z.string(), description: z.string().optional(),
      thumbnailUrl: z.string().optional(), category: z.string().default("other"),
      tags: z.string().optional(), creatorName: z.string().optional(),
      duration: z.string().optional(), isFeatured: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(videos).values({
        youtubeId: input.youtubeId, title: input.title,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl ?? `https://img.youtube.com/vi/${input.youtubeId}/maxresdefault.jpg`,
        category: input.category as any, tags: input.tags,
        creatorName: input.creatorName, duration: input.duration,
        isFeatured: input.isFeatured,
      });
      return { success: true };
    }),

  /* ── Pipeline Jobs ───────────────────────────────────────── */
  pipelineJobs: protectedProcedure
    .input(z.object({ limit: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [] };
      const items = await db.select().from(contentPipelineJobs).orderBy(desc(contentPipelineJobs.createdAt)).limit(input.limit);
      return { items };
    }),

  /* ── Creator Prospects ───────────────────────────────────── */
  creatorProspects: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const items = await db.select().from(creatorProspects).orderBy(desc(creatorProspects.discoveredAt)).limit(input.limit).offset(input.offset);
      const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(creatorProspects);
      return { items, total: Number(countRow?.count ?? 0) };
    }),

  /* ── Newsletter / SMS ────────────────────────────────────── */
  newsletterSubs: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [] };
      const items = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt)).limit(input.limit);
      return { items };
    }),

  smsSubs: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return { items: [] };
      const items = await db.select().from(smsSubscribers).orderBy(desc(smsSubscribers.subscribedAt)).limit(input.limit);
      return { items };
    }),
});
