import { stripeRouter } from "./stripe/router";
import { systemRouter } from "./_core/systemRouter";
import { adminRouter } from "./routers/adminRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { authRouter } from "./auth/authRouter";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  videos,
  watchlist,
  quizQuestions,
  quizScores,
  scheduleItems,
  reminders,
  uploadSlots,
  newsletterSubscribers,
  smsSubscribers,
  users,
  creatorProspects,
  scoutScanRuns,
  studioSessions,
  studioRundowns,
  studioStreamDestinations,
  socialPosts,
  creatorRevenueEvents,
  creatorPayoutRequests,
  liveStreams,
  liveChatMessages,
} from "../drizzle/schema";
import crypto from "crypto";
import { runCreatorScout, SCOUT_NICHES } from "./creatorScout";
import { eq, desc, and, like, inArray, sql } from "drizzle-orm";
import {
  sendWelcomeEmail,
  sendCreatorApplicationEmail,
  sendEpisodeDropEmail,
} from "./email";
import { sendSMS, SMS, validateTwilioCredentials, sendOTP, verifyOTP } from "./sms";
import { contentPipelineJobs } from "../drizzle/schema";

/* ============================================================
   App Router
   ============================================================ */
export const appRouter = router({
  system: systemRouter,
  stripe: stripeRouter,

  /* ── Auth ─────────────────────────────────────────────── */
  auth: authRouter,

  /* ── Admin ────────────────────────────────────────────── */
  admin: adminRouter,

  /* ── Videos ───────────────────────────────────────────── */
  videos: router({
    list: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          search: z.string().optional(),
          creatorName: z.string().optional(), // brand filter: 'CommunityCut', 'ZTVLIVE', etc.
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const { or, and } = await import("drizzle-orm");

        let query = db.select().from(videos).$dynamic();

        const conditions: any[] = [];
        if (input.category && input.category !== "all") {
          conditions.push(eq(videos.category, input.category as any));
        }
        if (input.creatorName) {
          conditions.push(eq(videos.creatorName, input.creatorName));
        }
        if (input.search) {
          const term = `%${input.search}%`;
          conditions.push(
            or(
              like(videos.title, term),
              like(videos.description, term),
              like(videos.tags, term),
              like(videos.creatorName, term),
            )
          );
        }
        if (conditions.length === 1) {
          query = query.where(conditions[0]);
        } else if (conditions.length > 1) {
          query = query.where(and(...conditions));
        }

        const items = await query
          .orderBy(desc(videos.publishedAt))
          .limit(input.limit)
          .offset(input.offset);

        return { items, total: items.length };
      }),

    featured: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(videos)
        .where(eq(videos.isFeatured, true))
        .orderBy(desc(videos.publishedAt))
        .limit(10);
    }),

    // Returns the single most recent featured video for the homepage hero section.
    // Automatically updated by the pipeline after each daily Zara/Zoe upload.
    latestEpisode: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(videos)
        .where(eq(videos.isFeatured, true))
        .orderBy(desc(videos.publishedAt))
        .limit(1);
      return rows[0] ?? null;
    }),

    byCategory: publicProcedure
      .input(z.object({ category: z.string(), limit: z.number().default(12) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(videos)
          .where(eq(videos.category, input.category as any))
          .orderBy(desc(videos.viewCount))
          .limit(input.limit);
      }),

    // Fetch all categories in a single query to avoid N+1 batch timeout
    allCategories: publicProcedure
      .input(z.object({ limitPerCategory: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        const CATS = ["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"] as const;
        if (!db) {
          return Object.fromEntries(CATS.map(c => [c, []])) as Record<string, typeof videos.$inferSelect[]>;
        }
        // Single query: fetch top N per category using a subquery approach
        // For MySQL we use a UNION ALL of per-category queries (fast with index)
        const results = await db
          .select()
          .from(videos)
          .orderBy(desc(videos.viewCount))
          .limit(input.limitPerCategory * CATS.length);

        // Group by category client-side, capping at limitPerCategory each
        const grouped: Record<string, typeof videos.$inferSelect[]> = {};
        for (const cat of CATS) grouped[cat] = [];
        for (const v of results) {
          const cat = v.category as string;
          if (grouped[cat] && grouped[cat].length < input.limitPerCategory) {
            grouped[cat].push(v);
          }
        }
        return grouped;
      }),

    trending: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(videos).orderBy(desc(videos.viewCount)).limit(12);
    }),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(videos).where(eq(videos.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    incrementView: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db
          .update(videos)
          .set({ viewCount: sql`${videos.viewCount} + 1` })
          .where(eq(videos.id, input.id));
        return { success: true };
      }),

    related: publicProcedure
      .input(z.object({ id: z.number(), category: z.string().optional(), limit: z.number().default(8) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { ne } = await import("drizzle-orm");
        let q = db.select().from(videos).$dynamic();
        if (input.category) {
          q = q.where(and(eq(videos.category, input.category as any), ne(videos.id, input.id)));
        } else {
          q = q.where(ne(videos.id, input.id));
        }
        return q.orderBy(desc(videos.viewCount)).limit(input.limit);
      }),

    // Admin: bulk import videos (YouTube IDs or Internet Archive identifiers)
    bulkImport: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          youtubeId: z.string(), // For IA content: use "ia:{identifier}" prefix
          title: z.string(),
          description: z.string().optional(),
          thumbnailUrl: z.string().optional(),
          category: z.enum(["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"]),
          tags: z.string().optional(),
          creatorName: z.string().optional(),
          duration: z.string().optional(),
          isFeatured: z.boolean().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        let imported = 0;
        let skipped = 0;
        for (const item of input.items) {
          // Skip duplicates by youtubeId
          const existing = await db.select({ id: videos.id }).from(videos)
            .where(eq(videos.youtubeId, item.youtubeId)).limit(1);
          if (existing.length > 0) { skipped++; continue; }
          await db.insert(videos).values({
            youtubeId: item.youtubeId,
            title: item.title,
            description: item.description ?? "",
            thumbnailUrl: item.thumbnailUrl ?? "",
            category: item.category,
            tags: item.tags ?? "",
            creatorName: item.creatorName ?? "Public Domain",
            duration: item.duration ?? "",
            isFeatured: item.isFeatured ?? false,
            isLive: false,
          });
          imported++;
        }
        return { imported, skipped, total: input.items.length };
      }),

    // Admin: delete a video by ID
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(videos).where(eq(videos.id, input.id));
        return { success: true };
      }),

    // Generate AI content for a video (transcript, extended description, FAQ)
    // Cached in DB — only calls LLM once per video
    generateAIContent: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Fetch the video
        const rows = await db.select().from(videos).where(eq(videos.id, input.id)).limit(1);
        const video = rows[0];
        if (!video) throw new TRPCError({ code: "NOT_FOUND" });

        // Return cached content if already generated
        if (video.aiTranscript && video.aiDescription && video.aiFaq) {
          return {
            transcript: video.aiTranscript,
            description: video.aiDescription,
            faq: JSON.parse(video.aiFaq) as Array<{ question: string; answer: string }>,
          };
        }

        const { invokeLLM } = await import("./_core/llm");

        // Build context from existing video metadata
        const context = [
          `Title: ${video.title}`,
          video.description ? `Description: ${video.description}` : "",
          video.category ? `Category: ${video.category}` : "",
          video.tags ? `Tags: ${video.tags}` : "",
          video.creatorName ? `Creator: ${video.creatorName}` : "",
          video.duration ? `Duration: ${video.duration}` : "",
        ].filter(Boolean).join("\n");

        // Generate all three in one LLM call using structured JSON
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a content writer for ZTVLIVE, a premium 24/7 live streaming platform. 
Generate rich, engaging content for video pages to improve SEO and viewer engagement.
Write in a professional yet approachable tone. All content must be accurate to the video's topic.`,
            },
            {
              role: "user",
              content: `Generate SEO-optimized content for this video:\n\n${context}\n\nProvide:\n1. A realistic AI-simulated transcript (200-350 words) that captures what would be discussed in this video. Write it as natural spoken dialogue/narration.
2. An extended description (3-4 paragraphs, 150-200 words total) expanding on the topic with context, key points, and why viewers should watch.
3. Five FAQ items (question + answer pairs) that viewers commonly ask about this topic.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "video_ai_content",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  transcript: { type: "string", description: "Simulated transcript of the video, 200-350 words" },
                  extendedDescription: { type: "string", description: "Extended description, 3-4 paragraphs" },
                  faq: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                      additionalProperties: false,
                    },
                    description: "5 FAQ items about the video topic",
                  },
                },
                required: ["transcript", "extendedDescription", "faq"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = result.choices[0]?.message?.content ?? "{}";
        let parsed: { transcript: string; extendedDescription: string; faq: Array<{ question: string; answer: string }> };
        try {
          parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
        }

        // Cache in DB
        await db.update(videos).set({
          aiTranscript: parsed.transcript,
          aiDescription: parsed.extendedDescription,
          aiFaq: JSON.stringify(parsed.faq),
        }).where(eq(videos.id, input.id));

        return {
          transcript: parsed.transcript,
          description: parsed.extendedDescription,
          faq: parsed.faq,
        };
      }),

    // Get all videos by a creator name (for "More from this creator" section)
    byCreator: publicProcedure
      .input(z.object({ creatorName: z.string(), excludeId: z.number().optional(), limit: z.number().default(6) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { ne } = await import("drizzle-orm");
        let q = db.select().from(videos).$dynamic();
        if (input.excludeId) {
          q = q.where(and(eq(videos.creatorName, input.creatorName), ne(videos.id, input.excludeId)));
        } else {
          q = q.where(eq(videos.creatorName, input.creatorName));
        }
        return q.orderBy(desc(videos.viewCount)).limit(input.limit);
      }),
  }),

  /* ── Watchlist ────────────────────────────────────────── */
  watchlist: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db
        .select({ watchlist, video: videos })
        .from(watchlist)
        .innerJoin(videos, eq(watchlist.videoId, videos.id))
        .where(eq(watchlist.userId, ctx.user.id))
        .orderBy(desc(watchlist.addedAt));
      return items.map((i) => ({ ...i.video, addedAt: i.watchlist.addedAt }));
    }),

    add: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Check if already in watchlist
        const existing = await db
          .select()
          .from(watchlist)
          .where(and(eq(watchlist.userId, ctx.user.id), eq(watchlist.videoId, input.videoId)))
          .limit(1);
        if (existing.length > 0) return { success: true, alreadyAdded: true };
        await db.insert(watchlist).values({ userId: ctx.user.id, videoId: input.videoId });
        return { success: true, alreadyAdded: false };
      }),

    remove: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db
          .delete(watchlist)
          .where(and(eq(watchlist.userId, ctx.user.id), eq(watchlist.videoId, input.videoId)));
        return { success: true };
      }),

    ids: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db
        .select({ videoId: watchlist.videoId })
        .from(watchlist)
        .where(eq(watchlist.userId, ctx.user.id));
      return items.map((i) => i.videoId);
    }),
  }),

  /* ── Quiz ─────────────────────────────────────────────── */
  quiz: router({
    questions: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        // Random selection via order by RAND()
        return db
          .select()
          .from(quizQuestions)
          .orderBy(sql`RAND()`)
          .limit(input.limit);
      }),

    submitScore: protectedProcedure
      .input(
        z.object({
          score: z.number(),
          questionsAnswered: z.number(),
          correctAnswers: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(quizScores).values({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "Anonymous",
          score: input.score,
          questionsAnswered: input.questionsAnswered,
          correctAnswers: input.correctAnswers,
        });
        return { success: true };
      }),

    leaderboard: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(quizScores)
          .orderBy(desc(quizScores.score))
          .limit(input.limit);
      }),

    myScores: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(quizScores)
        .where(eq(quizScores.userId, ctx.user.id))
        .orderBy(desc(quizScores.playedAt))
        .limit(10);
    }),
  }),

  /* ── Schedule ─────────────────────────────────────────── */
  schedule: router({
    list: publicProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const now = Date.now();
        const end = now + input.days * 24 * 60 * 60 * 1000;
        const items = await db
          .select()
          .from(scheduleItems)
          .orderBy(scheduleItems.startTime);
        return items.filter((i) => i.startTime >= now - 3600000 && i.startTime <= end);
      }),

    setReminder: protectedProcedure
      .input(z.object({ scheduleItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const existing = await db
          .select()
          .from(reminders)
          .where(
            and(
              eq(reminders.userId, ctx.user.id),
              eq(reminders.scheduleItemId, input.scheduleItemId)
            )
          )
          .limit(1);
        if (existing.length > 0) return { success: true, alreadySet: true };
        await db.insert(reminders).values({
          userId: ctx.user.id,
          scheduleItemId: input.scheduleItemId,
        });
        return { success: true, alreadySet: false };
      }),

    removeReminder: protectedProcedure
      .input(z.object({ scheduleItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db
          .delete(reminders)
          .where(
            and(
              eq(reminders.userId, ctx.user.id),
              eq(reminders.scheduleItemId, input.scheduleItemId)
            )
          );
        return { success: true };
      }),

    myReminders: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db
        .select({ reminder: reminders, schedule: scheduleItems })
        .from(reminders)
        .innerJoin(scheduleItems, eq(reminders.scheduleItemId, scheduleItems.id))
        .where(eq(reminders.userId, ctx.user.id));
      return items.map((i) => ({ ...i.schedule, reminderId: i.reminder.id }));
    }),
  }),

  /* ── Creator ──────────────────────────────────────────── */
  creator: router({
    bookSlot: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.string().optional(),
          scheduledAt: z.number(),
          youtubeId: z.string().optional(),
          phone: z.string().optional(),
          smsOptIn: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Update user phone + smsOptIn if provided
        if (input.phone) {
          await db.update(users).set({
            phone: input.phone,
            smsOptIn: input.smsOptIn ?? false,
          }).where(eq(users.id, ctx.user.id));
          // Refresh ctx.user for SMS check below
          ctx.user.phone = input.phone;
          ctx.user.smsOptIn = input.smsOptIn ?? false;
        }
        await db.insert(uploadSlots).values({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          category: input.category,
          scheduledAt: input.scheduledAt,
          youtubeId: input.youtubeId,
          status: "pending",
        });
        // Send confirmation email + owner notification
        if (ctx.user.email) {
          sendCreatorApplicationEmail({
            to: ctx.user.email,
            name: ctx.user.name ?? "Creator",
            title: input.title,
          }).catch(() => {});
        }
        // Send SMS confirmation if user has phone + opted in
        if (ctx.user.phone && ctx.user.smsOptIn) {
          sendSMS(ctx.user.phone, SMS.slotBooked(ctx.user.name ?? "Creator", input.title)).catch(() => {});
        }
        return { success: true };
      }),

    mySlots: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(uploadSlots)
        .where(eq(uploadSlots.userId, ctx.user.id))
        .orderBy(desc(uploadSlots.scheduledAt));
    }),

    // Creator: get their own videos on the platform
    // Uses creatorId (hard FK) only — name fallback removed to prevent cross-creator content leakage
    myVideos: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(videos)
        .where(eq(videos.creatorId, ctx.user.id))
        .orderBy(desc(videos.createdAt))
        .limit(200);
    }),

    // Creator: get their analytics summary
    myAnalytics: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalViews: 0, totalVideos: 0, totalLikes: 0, totalRevenue: 0, pendingRevenue: 0 };
      const { or, sum } = await import("drizzle-orm");
      const [videoStats] = await db
        .select({
          totalVideos: sql<number>`count(*)`,
          totalViews: sql<number>`sum(\`viewCount\`)`,
          totalLikes: sql<number>`sum(\`likeCount\`)`,
        })
        .from(videos)
        .where(eq(videos.creatorId, ctx.user.id));
      const [revenueStats] = await db
        .select({
          totalRevenue: sql<number>`sum(\`creatorShare\`)`,
          pendingRevenue: sql<number>`sum(case when \`status\` = 'pending' then \`creatorShare\` else 0 end)`,
        })
        .from(creatorRevenueEvents)
        .where(eq(creatorRevenueEvents.creatorId, ctx.user.id));
      return {
        totalVideos: Number(videoStats?.totalVideos ?? 0),
        totalViews: Number(videoStats?.totalViews ?? 0),
        totalLikes: Number(videoStats?.totalLikes ?? 0),
        totalRevenue: Number(revenueStats?.totalRevenue ?? 0),
        pendingRevenue: Number(revenueStats?.pendingRevenue ?? 0),
      };
    }),

    // Creator: get revenue events history
    myRevenueHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const items = await db
          .select()
          .from(creatorRevenueEvents)
          .where(eq(creatorRevenueEvents.creatorId, ctx.user.id))
          .orderBy(desc(creatorRevenueEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset);
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(creatorRevenueEvents)
          .where(eq(creatorRevenueEvents.creatorId, ctx.user.id));
        return { items, total: Number(countRow?.count ?? 0) };
      }),

    // Creator: request a payout
    requestPayout: protectedProcedure
      .input(z.object({
        amount: z.number().min(50),
        method: z.enum(["paypal", "bank_transfer", "check"]).default("paypal"),
        paymentDetails: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "creator" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Creator account required" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(creatorPayoutRequests).values({
          creatorId: ctx.user.id,
          amount: input.amount,
          method: input.method,
          paymentDetails: input.paymentDetails,
          status: "pending",
        });
        return { success: true };
      }),

    // Creator: fetch channel videos for preview (no DB write)
    fetchChannelVideos: protectedProcedure
      .input(z.object({
        channelUrl: z.string().min(1),
        maxVideos: z.number().min(1).max(500).default(200),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "creator" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Creator account required" });
        }
        const { ENV } = await import("./_core/env");
        const rawUrl = input.channelUrl.trim();
        // Normalise: strip trailing slashes and query params
        const url = rawUrl.replace(/[/?#].*$/, (m) => m.startsWith("/") ? m.split("?")[0].split("#")[0] : "").replace(/\/+$/, "") || rawUrl;

        let channelId: string | null = null;
        let handleOrUser: string | null = null;
        let isUserUrl = false;

        const channelMatch = rawUrl.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/);
        const handleMatch = rawUrl.match(/\/@([A-Za-z0-9_.-]+)/);
        const userMatch = rawUrl.match(/\/user\/([A-Za-z0-9_-]+)/);
        const customMatch = rawUrl.match(/\/c\/([A-Za-z0-9_-]+)/);

        if (channelMatch) {
          channelId = channelMatch[1];
        } else if (handleMatch) {
          handleOrUser = handleMatch[1];
        } else if (userMatch) {
          handleOrUser = userMatch[1];
          isUserUrl = true;
        } else if (customMatch) {
          handleOrUser = customMatch[1];
        } else {
          const clean = rawUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/?/, "").replace(/^@/, "").trim();
          if (/^UC[A-Za-z0-9_-]{22}$/.test(clean)) channelId = clean;
          else handleOrUser = clean.replace(/^@/, "");
        }

        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "";
        const SERPER_KEY = ENV.serperApiKey;

        const safeFetch = async (u: string, opts?: RequestInit) => {
          const res = await fetch(u, { ...opts, signal: AbortSignal.timeout(12000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res;
        };
        const fetchJson = async (u: string) => (await safeFetch(u)).json() as Promise<any>;

        // ── Step 1: Resolve channel ID ───────────────────────────────────────
        if (!channelId && handleOrUser) {
          // Method A: YouTube Data API (fastest, requires key)
          if (YOUTUBE_API_KEY) {
            try {
              const r = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handleOrUser)}&key=${YOUTUBE_API_KEY}`);
              channelId = r?.items?.[0]?.id ?? null;
              if (!channelId) {
                const r2 = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(handleOrUser)}&key=${YOUTUBE_API_KEY}`);
                channelId = r2?.items?.[0]?.id ?? null;
              }
            } catch { /* continue */ }
          }

          // Method B: Try /user RSS feed (works for legacy usernames)
          if (!channelId && isUserUrl && handleOrUser) {
            try {
              const rss = await (await safeFetch(`https://www.youtube.com/feeds/videos.xml?user=${encodeURIComponent(handleOrUser)}`)).text();
              const m = rss.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
              if (m) channelId = `UC${m[1]}`;
            } catch { /* continue */ }
          }

          // Method C: Scrape YouTube channel page for externalId (no API key needed)
          if (!channelId) {
            try {
              const pageUrl = handleOrUser.startsWith("UC")
                ? `https://www.youtube.com/channel/${handleOrUser}`
                : `https://www.youtube.com/@${handleOrUser}`;
              const html = await (await safeFetch(pageUrl)).text();
              // externalId is the canonical channel ID in page JSON
              const extMatch = html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/);
              if (extMatch) channelId = extMatch[1];
              // Also try to grab channel name and thumbnail from the page
            } catch { /* continue */ }
          }

          // Method D: Serper fallback — look for /channel/UC pattern in results
          if (!channelId && SERPER_KEY) {
            try {
              const sr = await safeFetch("https://google.serper.dev/search", {
                method: "POST",
                headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ q: `youtube channel ${handleOrUser} site:youtube.com`, num: 5 }),
              });
              const sd = await sr.json() as any;
              for (const result of (sd?.organic ?? [])) {
                const m = (result?.link ?? "").match(/\/channel\/(UC[A-Za-z0-9_-]{22})/);
                if (m) { channelId = m[1]; break; }
              }
            } catch { /* continue */ }
          }
        }

        if (!channelId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Could not resolve this YouTube channel. Try using the full channel URL like https://youtube.com/@YourHandle or https://youtube.com/channel/UCxxxxxxx",
          });
        }

        // ── Step 2: Get channel metadata ─────────────────────────────────────
        let uploadsPlaylistId: string | null = null;
        let channelName = "";
        let channelThumbnail = "";
        let channelVideoCount = 0;

        if (YOUTUBE_API_KEY) {
          try {
            const cr = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`);
            uploadsPlaylistId = cr?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
            channelName = cr?.items?.[0]?.snippet?.title ?? "";
            channelThumbnail = cr?.items?.[0]?.snippet?.thumbnails?.default?.url ?? "";
            channelVideoCount = Number(cr?.items?.[0]?.statistics?.videoCount ?? 0);
          } catch { /* continue */ }
        }

        // ── Step 3: Fetch video list ──────────────────────────────────────────
        const videoItems: Array<{ youtubeId: string; title: string; description: string; thumbnailUrl: string; publishedAt: string; alreadyImported: boolean }> = [];

        if (uploadsPlaylistId && YOUTUBE_API_KEY) {
          // YouTube Data API path: fetches up to maxVideos in batches of 50
          let pageToken: string | undefined = undefined;
          while (videoItems.length < input.maxVideos) {
            const batchSize = Math.min(50, input.maxVideos - videoItems.length);
            const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
            const pr = await fetchJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${batchSize}&key=${YOUTUBE_API_KEY}${ptParam}`);
            for (const item of (pr.items ?? [])) {
              const vid = item.snippet?.resourceId?.videoId;
              if (!vid) continue;
              videoItems.push({
                youtubeId: vid,
                title: item.snippet?.title ?? "",
                description: (item.snippet?.description ?? "").slice(0, 300),
                thumbnailUrl: item.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
                publishedAt: item.snippet?.publishedAt ?? "",
                alreadyImported: false,
              });
            }
            pageToken = pr.nextPageToken;
            if (!pageToken) break;
          }
        } else {
          // RSS fallback — YouTube RSS returns up to 15 most recent videos
          // Note: RSS is limited to 15 videos; for more, a YouTube API key is needed
          try {
            const rssRes = await safeFetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
            const rssText = await rssRes.text();

            // Extract channel name from RSS if not already set
            if (!channelName) {
              const nameMatch = rssText.match(/<title>([^<]+)<\/title>/);
              if (nameMatch) channelName = nameMatch[1].replace(/&amp;/g, "&");
            }

            // Parse entries — each entry has videoId, title, published, thumbnail
            const entries = rssText.split("<entry>").slice(1);
            for (let i = 0; i < Math.min(entries.length, input.maxVideos); i++) {
              const entry = entries[i];
              const vidMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
              const titleMatch = entry.match(/<media:title>([^<]+)<\/media:title>/) || entry.match(/<title>([^<]+)<\/title>/);
              const pubMatch = entry.match(/<published>([^<]+)<\/published>/);
              const thumbMatch = entry.match(/url="(https:\/\/i[0-9]*\.ytimg\.com[^"]+)"/);
              if (!vidMatch) continue;
              const vid = vidMatch[1];
              videoItems.push({
                youtubeId: vid,
                title: (titleMatch?.[1] ?? `Video ${i + 1}`)
                  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
                description: "",
                thumbnailUrl: thumbMatch?.[1] || `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
                publishedAt: pubMatch?.[1] ?? "",
                alreadyImported: false,
              });
            }
          } catch (e) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch channel videos. Please try again." });
          }
        }

        if (videoItems.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No videos found on this channel. Make sure the channel is public and has uploaded videos." });
        }

        // ── Step 4: Mark already-imported videos ─────────────────────────────
        const db = await getDb();
        if (db) {
          const youtubeIds = videoItems.map(v => v.youtubeId);
          const existing = await db.select({ youtubeId: videos.youtubeId }).from(videos).where(inArray(videos.youtubeId, youtubeIds));
          const existingSet = new Set(existing.map(e => e.youtubeId));
          for (const v of videoItems) v.alreadyImported = existingSet.has(v.youtubeId);
        }

        return { channelId, channelName, channelThumbnail, channelVideoCount, videos: videoItems };
      }),

    // Creator: import selected videos (called after preview/select step)
    importYoutubeChannel: protectedProcedure
      .input(z.object({
        category: z.enum(["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"]).default("other"),
        selectedVideos: z.array(z.object({
          youtubeId: z.string().min(1),
          title: z.string().min(1),
          description: z.string().default(""),
          thumbnailUrl: z.string().default(""),
          publishedAt: z.string().default(""),
        })).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "creator" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Creator account required to import videos" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const allIds = input.selectedVideos.map(v => v.youtubeId);

        // Single batch query to find all already-imported IDs
        const existingRows = await db
          .select({ youtubeId: videos.youtubeId })
          .from(videos)
          .where(inArray(videos.youtubeId, allIds));
        const existingSet = new Set(existingRows.map(r => r.youtubeId));

        const toInsert = input.selectedVideos.filter(v => !existingSet.has(v.youtubeId));
        const skippedVideos = input.selectedVideos.filter(v => existingSet.has(v.youtubeId));

        // Batch insert in chunks of 50 to avoid query size limits
        const CHUNK = 50;
        for (let i = 0; i < toInsert.length; i += CHUNK) {
          const chunk = toInsert.slice(i, i + CHUNK);
          await db.insert(videos).values(
            chunk.map(item => ({
              youtubeId: item.youtubeId,
              title: item.title,
              description: item.description || "",
              thumbnailUrl: item.thumbnailUrl || `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`,
              category: input.category,
              tags: "",
              creatorName: ctx.user.name ?? "Creator",
              creatorId: ctx.user.id,
              duration: "",
              isFeatured: false,
              isLive: false,
              status: "approved" as const,
            }))
          );
        }

        return {
          imported: toInsert.length,
          skipped: skippedVideos.length,
          total: input.selectedVideos.length,
          importedTitles: toInsert.map(v => v.title),
          skippedTitles: skippedVideos.map(v => v.title),
        };
      }),

    // Creator: bulk import YouTube videos from their channel
    bulkImportYoutube: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          youtubeId: z.string().min(1),
          title: z.string().min(1),
          description: z.string().optional(),
          thumbnailUrl: z.string().optional(),
          category: z.enum(["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"]),
          tags: z.string().optional(),
          duration: z.string().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "creator" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Creator account required to import videos" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        let imported = 0;
        let skipped = 0;
        for (const item of input.items) {
          const existing = await db.select({ id: videos.id }).from(videos)
            .where(eq(videos.youtubeId, item.youtubeId)).limit(1);
          if (existing.length > 0) { skipped++; continue; }
          await db.insert(videos).values({
            youtubeId: item.youtubeId,
            title: item.title,
            description: item.description ?? "",
            thumbnailUrl: item.thumbnailUrl ?? `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`,
            category: item.category,
            tags: item.tags ?? "",
            creatorName: ctx.user.name ?? "Creator",
            creatorId: ctx.user.id,  // Hard ownership link
            duration: item.duration ?? "",
            isFeatured: false,
            isLive: false,
            status: "approved",  // Creator self-published content is auto-approved
          });
          imported++;
        }
        return { imported, skipped, total: input.items.length };
      }),
  }),

  /* ── SMS ─────────────────────────────────────────────── */
  sms: router({
    // Opt-in to SMS notifications (homepage form, creator form)
    optIn: publicProcedure
      .input(
        z.object({
          phone: z.string().min(10).max(20),
          name: z.string().optional(),
          source: z.enum(["homepage", "creator_form", "checkout"]).default("homepage"),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        try {
          await db.insert(smsSubscribers).values({
            phone: input.phone,
            name: input.name,
            source: input.source,
            optedIn: true,
          });
          // Send welcome SMS
          sendSMS(input.phone, SMS.earlyAccessConfirm(input.name)).catch(() => {});
          return { success: true };
        } catch {
          return { success: true, alreadySubscribed: true };
        }
      }),

    // Notify all SMS subscribers of a new episode
    notifyNewEpisode: protectedProcedure
      .input(
        z.object({
          showName: z.string(),
          episodeTitle: z.string(),
          targetPhones: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const subscribers = input.targetPhones
          ? input.targetPhones.map((phone) => ({ phone }))
          : await db.select({ phone: smsSubscribers.phone }).from(smsSubscribers).where(eq(smsSubscribers.optedIn, true));
        const message = SMS.newEpisodeDrop(input.showName, input.episodeTitle);
        let sent = 0;
        for (const sub of subscribers) {
          const ok = await sendSMS(sub.phone, message);
          if (ok) sent++;
        }
        return { sent, total: subscribers.length };
      }),

    // Get SMS subscriber count (admin)
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { total: 0, optedIn: 0 };
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(smsSubscribers);
      const [optedIn] = await db.select({ count: sql<number>`count(*)` }).from(smsSubscribers).where(eq(smsSubscribers.optedIn, true));
      return { total: Number(total?.count ?? 0), optedIn: Number(optedIn?.count ?? 0) };
    }),

    // Validate Twilio credentials
    validate: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const valid = await validateTwilioCredentials();
      return { valid };
    }),

    // Send OTP via Twilio Verify
    sendOTP: publicProcedure
      .input(z.object({
        phone: z.string().min(10).max(20),
        channel: z.enum(["sms", "call"]).default("sms"),
      }))
      .mutation(async ({ input }) => {
        const result = await sendOTP(input.phone, input.channel);
        if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "Failed to send OTP" });
        return { success: true };
      }),

    // Verify OTP code
    verifyOTP: publicProcedure
      .input(z.object({
        phone: z.string().min(10).max(20),
        code: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const result = await verifyOTP(input.phone, input.code);
        if (!result.valid) throw new TRPCError({ code: "BAD_REQUEST", message: result.error ?? "Invalid or expired code" });
        return { valid: true };
      }),
  }),

  /* ── Newsletter ───────────────────────────────────────── */
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        try {
          await db.insert(newsletterSubscribers).values({ email: input.email });
          sendWelcomeEmail(input.email).catch(() => {});
          return { success: true };
        } catch {
          return { success: true, alreadySubscribed: true };
        }
      }),
    // Blast all newsletter subscribers with a new episode drop (admin only)
    episodeBlast: protectedProcedure
      .input(z.object({
        showTitle: z.string(),
        episodeTitle: z.string(),
        description: z.string(),
        watchUrl: z.string(),
        thumbnailUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const subscribers = await db.select({ email: newsletterSubscribers.email }).from(newsletterSubscribers);
        let sent = 0;
        for (const sub of subscribers) {
          try {
            await sendEpisodeDropEmail({
              to: sub.email,
              showTitle: input.showTitle,
              episodeTitle: input.episodeTitle,
              description: input.description,
              watchUrl: input.watchUrl,
              thumbnailUrl: input.thumbnailUrl,
            });
            sent++;
          } catch { /* skip failed sends */ }
        }
        return { sent, total: subscribers.length };
      }),
  }),

  /* ── Platform Stats ─────────────────────────────────── */
  platform: router({
    stats: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { videoCount: 28, creatorCount: 4, liveChannels: 2, subscriberCount: 1 };
      const [videoCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(videos);
      const [creatorCount] = await db
        .select({ count: sql<number>`count(distinct \`creatorName\`)` })
        .from(videos);
      const [liveCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(videos)
        .where(eq(videos.isLive, true));
      const [subscriberCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(newsletterSubscribers);
      return {
        videoCount: Number(videoCount?.count ?? 0),
        creatorCount: Number(creatorCount?.count ?? 0),
        liveChannels: Math.max(Number(liveCount?.count ?? 0), 2),
        subscriberCount: Number(subscriberCount?.count ?? 0),
      };
    }),
  }),

  /* ── Creator Go Live ─────────────────────────────────── */
  creatorLive: router({
    // Create a new stream session (returns streamKey + stream record)
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(3).max(255),
        description: z.string().optional(),
        category: z.enum(["live","tech","gaming","sports","movies","podcasts","news","music","other"]).default("live"),
        tags: z.string().optional(),
        playbackType: z.enum(["youtube","daily","rtmp"]).default("youtube"),
        playbackId: z.string().optional(),
        chatEnabled: z.boolean().default(true),
        scheduledAt: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "creator" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Creator account required to go live" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const streamKey = crypto.randomBytes(16).toString("hex");
        const [result] = await db.insert(liveStreams).values({
          creatorId: ctx.user.id,
          creatorName: ctx.user.name ?? "Creator",
          title: input.title,
          description: input.description,
          category: input.category,
          tags: input.tags,
          playbackType: input.playbackType,
          playbackId: input.playbackId,
          chatEnabled: input.chatEnabled,
          scheduledAt: input.scheduledAt,
          streamKey,
          status: "scheduled",
        });
        const streamId = (result as any).insertId as number;
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
        return stream;
      }),

    // Start a stream (set status to live)
    start: protectedProcedure
      .input(z.object({ streamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, input.streamId));
        if (!stream) throw new TRPCError({ code: "NOT_FOUND" });
        if (stream.creatorId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.update(liveStreams).set({ status: "live", startedAt: Date.now() }).where(eq(liveStreams.id, input.streamId));
        return { success: true };
      }),

    // End a stream
    end: protectedProcedure
      .input(z.object({ streamId: z.number(), vodUrl: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, input.streamId));
        if (!stream) throw new TRPCError({ code: "NOT_FOUND" });
        if (stream.creatorId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.update(liveStreams).set({ status: "ended", endedAt: Date.now(), vodUrl: input.vodUrl }).where(eq(liveStreams.id, input.streamId));
        return { success: true };
      }),

    // Update stream metadata (title, description, playbackId)
    update: protectedProcedure
      .input(z.object({
        streamId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        playbackId: z.string().optional(),
        playbackType: z.enum(["youtube","daily","rtmp"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, input.streamId));
        if (!stream) throw new TRPCError({ code: "NOT_FOUND" });
        if (stream.creatorId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const updates: Partial<typeof stream> = {};
        if (input.title) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.playbackId !== undefined) updates.playbackId = input.playbackId;
        if (input.playbackType) updates.playbackType = input.playbackType;
        await db.update(liveStreams).set(updates).where(eq(liveStreams.id, input.streamId));
        return { success: true };
      }),

    // Get creator's own streams (history + active)
    myStreams: protectedProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(liveStreams)
          .where(eq(liveStreams.creatorId, ctx.user.id))
          .orderBy(sql`createdAt DESC`)
          .limit(input.limit)
          .offset(input.offset);
      }),

    // Get a single stream by ID (creator only — includes streamKey)
    getStream: protectedProcedure
      .input(z.object({ streamId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, input.streamId));
        if (!stream) throw new TRPCError({ code: "NOT_FOUND" });
        if (stream.creatorId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return stream;
      }),

    // Send a chat message to a live stream
    sendChat: protectedProcedure
      .input(z.object({
        streamId: z.number(),
        message: z.string().min(1).max(500),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, input.streamId));
        if (!stream || stream.status !== "live") throw new TRPCError({ code: "BAD_REQUEST", message: "Stream is not live" });
        if (!stream.chatEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Chat is disabled for this stream" });
        const isCreator = stream.creatorId === ctx.user.id;
        await db.insert(liveChatMessages).values({
          streamId: input.streamId,
          userId: ctx.user.id,
          displayName: ctx.user.name ?? "Viewer",
          avatarUrl: ctx.user.avatar,
          message: input.message,
          isCreator,
        });
        return { success: true };
      }),

    // Get recent chat messages for a stream (poll every 3s)
    getChat: publicProcedure
      .input(z.object({ streamId: z.number(), since: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const query = db.select().from(liveChatMessages)
          .where(and(
            eq(liveChatMessages.streamId, input.streamId),
            eq(liveChatMessages.isDeleted, false),
          ))
          .orderBy(sql`createdAt DESC`)
          .limit(50);
        return query;
      }),
  }),

  /* ── Public Live Streams ──────────────────────────────── */
  publicLive: router({
    // Get all currently live creator streams
    getLiveStreams: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(liveStreams)
          .where(eq(liveStreams.status, "live"))
          .orderBy(sql`viewerCount DESC`)
          .limit(input.limit);
      }),

    // Get a single public stream (no streamKey exposed)
    getStream: publicProcedure
      .input(z.object({ streamId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stream] = await db.select({
          id: liveStreams.id,
          creatorId: liveStreams.creatorId,
          creatorName: liveStreams.creatorName,
          title: liveStreams.title,
          description: liveStreams.description,
          thumbnailUrl: liveStreams.thumbnailUrl,
          category: liveStreams.category,
          status: liveStreams.status,
          playbackType: liveStreams.playbackType,
          playbackId: liveStreams.playbackId,
          viewerCount: liveStreams.viewerCount,
          chatEnabled: liveStreams.chatEnabled,
          startedAt: liveStreams.startedAt,
          tags: liveStreams.tags,
        }).from(liveStreams).where(eq(liveStreams.id, input.streamId));
        if (!stream) throw new TRPCError({ code: "NOT_FOUND" });
        return stream;
      }),

    // Increment viewer count
    joinStream: publicProcedure
      .input(z.object({ streamId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return;
        await db.update(liveStreams)
          .set({ viewerCount: sql`viewerCount + 1`, peakViewerCount: sql`GREATEST(peakViewerCount, viewerCount + 1)` })
          .where(and(eq(liveStreams.id, input.streamId), eq(liveStreams.status, "live")));
      }),

    // Decrement viewer count
    leaveStream: publicProcedure
      .input(z.object({ streamId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return;
        await db.update(liveStreams)
          .set({ viewerCount: sql`GREATEST(0, viewerCount - 1)` })
          .where(and(eq(liveStreams.id, input.streamId), eq(liveStreams.status, "live")));
      }),
  }),

  /* ── Live Stats ───────────────────────────────────────── */
  live: router({
    // Simulated live viewer count
    viewerCount: publicProcedure.query(() => {
      const base = 1200;
      const variance = Math.floor(Math.random() * 400);
      return { count: base + variance, liveVideoId: "jfKfPfyJRdk" };
    }),
    // Current playing video with elapsed seconds — the core of the 24/7 sync engine
    current: publicProcedure.query(async () => {
      const { getLiveSync } = await import("./tvScheduler");
      return getLiveSync();
    }),
    // Upcoming schedule slots (next N videos)
    upcoming: publicProcedure
      .input(z.object({ count: z.number().min(1).max(50).default(10) }))
      .query(async ({ input }) => {
        const { getUpcomingSchedule } = await import("./tvScheduler");
        return getUpcomingSchedule(input.count);
      }),
    // Full day schedule for the Schedule page
    daySchedule: publicProcedure.query(async () => {
      const { getDaySchedule } = await import("./tvScheduler");
      return getDaySchedule(new Date());
    }),
  }),

  /* ── Creator Scout ────────────────────────────────────── */
  scout: router({
    // Get all prospects with optional filters (admin only)
    prospects: protectedProcedure
      .input(z.object({
        status: z.enum(["new", "contacted", "applied", "approved", "rejected", "unresponsive", "all"]).default("all"),
        niche: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        let q = db.select().from(creatorProspects).$dynamic();
        if (input.status !== "all") q = q.where(eq(creatorProspects.status, input.status));
        if (input.niche) q = q.where(eq(creatorProspects.niche, input.niche));
        const items = await q.orderBy(desc(creatorProspects.score)).limit(input.limit).offset(input.offset);
        const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(creatorProspects);
        return { items, total: Number(countRow?.count ?? 0) };
      }),

    // Update prospect status (admin only)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "applied", "approved", "rejected", "unresponsive"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(creatorProspects)
          .set({ status: input.status, notes: input.notes, outreachSentAt: input.status === "contacted" ? Date.now() : undefined })
          .where(eq(creatorProspects.id, input.id));
        return { success: true };
      }),

    // Run a manual scan (admin only)
    runScan: protectedProcedure
      .input(z.object({ niches: z.array(z.string()).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const result = await runCreatorScout("admin", input.niches);
        return result;
      }),

    // Get scan run history (admin only)
    scanHistory: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(scoutScanRuns).orderBy(desc(scoutScanRuns.startedAt)).limit(20);
    }),

    // Get scout stats (admin only)
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { total: 0, new: 0, contacted: 0, applied: 0, approved: 0 };
      const rows = await db.select({ status: creatorProspects.status, count: sql<number>`count(*)` })
        .from(creatorProspects)
        .groupBy(creatorProspects.status);
      const map = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(creatorProspects);
      return { total: Number(total?.count ?? 0), ...map };
    }),

    // Get available niches
    niches: publicProcedure.query(() => SCOUT_NICHES.map((n) => ({ id: n.id, label: n.label }))),
  }),

  /* ============================================================
     Studio Mode — Phases 2, 3, 4
     ============================================================ */
  studio: router({
    // Phase 2: Create a guest invite session
    createSession: protectedProcedure
      .input(z.object({ title: z.string().optional(), virtualSetId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const sessionId = crypto.randomUUID();
        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
        await db.insert(studioSessions).values({
          sessionId,
          hostUserId: ctx.user.id,
          title: input.title ?? "ZTVLIVE Studio Session",
          virtualSetId: input.virtualSetId ?? "none",
          inviteToken,
          inviteExpiresAt,
          status: "waiting",
        });
        return { sessionId, inviteToken, inviteExpiresAt };
      }),

    // Phase 2: Get session by invite token
    getSessionByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [session] = await db.select().from(studioSessions)
          .where(eq(studioSessions.inviteToken, input.token))
          .limit(1);
        if (!session) return null;
        if (session.inviteExpiresAt && Date.now() > session.inviteExpiresAt) return null;
        return { sessionId: session.sessionId, title: session.title, virtualSetId: session.virtualSetId, status: session.status };
      }),

    // Phase 2: Update session status
    updateSessionStatus: protectedProcedure
      .input(z.object({ sessionId: z.string(), status: z.enum(["waiting", "live", "ended"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [session] = await db.select().from(studioSessions)
          .where(eq(studioSessions.sessionId, input.sessionId)).limit(1);
        if (!session || session.hostUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const updates: Record<string, unknown> = { status: input.status };
        if (input.status === "live") updates.startedAt = Date.now();
        if (input.status === "ended") updates.endedAt = Date.now();
        await db.update(studioSessions).set(updates as any).where(eq(studioSessions.sessionId, input.sessionId));
        return { ok: true };
      }),

    // Phase 2: Get my sessions
    mySessions: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(studioSessions)
        .where(eq(studioSessions.hostUserId, ctx.user.id))
        .orderBy(desc(studioSessions.createdAt))
        .limit(10);
    }),

    // Phase 3: Save a rundown
    saveRundown: protectedProcedure
      .input(z.object({
        rundownId: z.string().optional(),
        title: z.string(),
        segments: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(["intro", "interview", "break", "outro", "custom"]),
          durationSeconds: z.number(),
          lowerThird: z.string().optional(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const totalDurationSeconds = input.segments.reduce((sum, s) => sum + s.durationSeconds, 0);
        const segmentsJson = JSON.stringify(input.segments);
        if (input.rundownId) {
          const [existing] = await db.select().from(studioRundowns)
            .where(and(eq(studioRundowns.rundownId, input.rundownId), eq(studioRundowns.userId, ctx.user.id))).limit(1);
          if (existing) {
            await db.update(studioRundowns).set({ title: input.title, segments: segmentsJson, totalDurationSeconds, updatedAt: new Date() })
              .where(eq(studioRundowns.rundownId, input.rundownId));
            return { rundownId: input.rundownId };
          }
        }
        const rundownId = crypto.randomUUID();
        await db.insert(studioRundowns).values({ rundownId, userId: ctx.user.id, title: input.title, segments: segmentsJson, totalDurationSeconds });
        return { rundownId };
      }),

    // Phase 3: Get my rundowns
    myRundowns: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(studioRundowns)
        .where(eq(studioRundowns.userId, ctx.user.id))
        .orderBy(desc(studioRundowns.updatedAt))
        .limit(20);
      return rows.map((r) => ({ ...r, segments: JSON.parse(r.segments) as any[] }));
    }),

    // Phase 4: Save stream destination
    saveDestination: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        platform: z.enum(["youtube", "twitch", "ztvlive", "custom"]),
        label: z.string(),
        rtmpUrl: z.string(),
        streamKey: z.string(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.id) {
          await db.update(studioStreamDestinations)
            .set({ platform: input.platform, label: input.label, rtmpUrl: input.rtmpUrl, streamKey: input.streamKey, enabled: input.enabled ?? true })
            .where(and(eq(studioStreamDestinations.id, input.id), eq(studioStreamDestinations.userId, ctx.user.id)));
          return { id: input.id };
        }
        const [result] = await db.insert(studioStreamDestinations).values({
          userId: ctx.user.id,
          platform: input.platform,
          label: input.label,
          rtmpUrl: input.rtmpUrl,
          streamKey: input.streamKey,
          enabled: input.enabled ?? true,
        });
        return { id: (result as any).insertId as number };
      }),

    // Phase 4: Get my stream destinations
    myDestinations: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(studioStreamDestinations)
        .where(eq(studioStreamDestinations.userId, ctx.user.id))
        .orderBy(studioStreamDestinations.platform);
    }),

    // Phase 4: Delete stream destination
    deleteDestination: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(studioStreamDestinations)
          .where(and(eq(studioStreamDestinations.id, input.id), eq(studioStreamDestinations.userId, ctx.user.id)));
        return { ok: true };
      }),

    // Phase 4: Toggle destination enabled/disabled
    toggleDestination: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(studioStreamDestinations)
          .set({ enabled: input.enabled })
          .where(and(eq(studioStreamDestinations.id, input.id), eq(studioStreamDestinations.userId, ctx.user.id)));
        return { ok: true };
      }),
  }),
  /* ── Social Media Auto-Post ─────────────────────────── */
  social: router({
    // Create a draft or scheduled post
    createPost: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "facebook", "twitter", "tiktok"]),
        contentType: z.enum(["post", "reel", "story", "thread"]).default("post"),
        caption: z.string().min(1).max(2200),
        mediaUrl: z.string().optional(),
        scheduledAt: z.number().optional(), // UTC ms
      }))
      .mutation(async ({ ctx, input }) => {
        // ─── ZTVLIVE Content Guard ────────────────────────────────────────
        // CommunityCut content is NOT allowed on ZTVLIVE channels.
        // Exception: The Nia Luxe Show is a ZTVLIVE original and IS allowed.
        const captionLower = input.caption.toLowerCase();
        const isNiaShow = captionLower.includes("nia luxe") || captionLower.includes("nialuxe") || captionLower.includes("nia_luxe");
        const BLOCKED_TERMS = [
          "communitycut.com",
          "@communitycut_weekly",
          "#communitycut",
          "communitycut weekly",
          "barbers: you are in the chair",
          "barber booking",
          "book your barber",
          "book your appointment",
          "communitycut app",
        ];
        if (!isNiaShow) {
          // Check if any blocked CommunityCut term appears
          const blockedTerm = BLOCKED_TERMS.find(term => captionLower.includes(term.toLowerCase()));
          if (blockedTerm) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `This post contains CommunityCut content and cannot be published on ZTVLIVE channels. Only The Nia Luxe Show content from CommunityCut is permitted here. Please use the CommunityCut project to post this content.`,
            });
          }
        }
        // ─────────────────────────────────────────────────────────────────
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [result] = await db.insert(socialPosts).values({
          userId: ctx.user.id,
          platform: input.platform,
          contentType: input.contentType,
          caption: input.caption,
          mediaUrl: input.mediaUrl,
          status: input.scheduledAt ? "scheduled" : "draft",
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        });
        return { id: (result as any).insertId as number };
      }),

    // List my posts
    myPosts: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "facebook", "twitter", "tiktok", "all"]).default("all"),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        let q = db.select().from(socialPosts)
          .where(eq(socialPosts.userId, ctx.user.id))
          .$dynamic();
        if (input.platform !== "all") {
          q = q.where(and(eq(socialPosts.userId, ctx.user.id), eq(socialPosts.platform, input.platform)));
        }
        return q.orderBy(desc(socialPosts.createdAt)).limit(input.limit);
      }),

    // Delete a post
    deletePost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(socialPosts)
          .where(and(eq(socialPosts.id, input.id), eq(socialPosts.userId, ctx.user.id)));
        return { ok: true };
      }),

    // Mark a post as published (after Instagram MCP confirms)
    markPublished: protectedProcedure
      .input(z.object({ id: z.number(), externalPostId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(socialPosts)
          .set({ status: "published", publishedAt: new Date(), externalPostId: input.externalPostId })
          .where(and(eq(socialPosts.id, input.id), eq(socialPosts.userId, ctx.user.id)));
        return { ok: true };
      }),

    // Publish a draft post to Instagram via MCP
    publishToInstagram: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Fetch the post
        const [post] = await db.select().from(socialPosts)
          .where(and(eq(socialPosts.id, input.id), eq(socialPosts.userId, ctx.user.id)))
          .limit(1);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
        if (post.platform !== "instagram") throw new TRPCError({ code: "BAD_REQUEST", message: "Only Instagram posts can be published via this method" });
        try {
          // Use Instagram MCP to publish
          const { execSync } = await import("child_process");
          const mcpInput = JSON.stringify({
            caption: post.caption,
            ...(post.mediaUrl ? { image_url: post.mediaUrl } : {}),
          });
          const result = execSync(
            `manus-mcp-cli tool call create_photo_post --server instagram --input '${mcpInput.replace(/'/g, "'\\''")}' 2>&1`,
            { timeout: 30000, encoding: "utf-8" }
          );
          // Parse result for post ID
          let externalId: string | undefined;
          try {
            const parsed = JSON.parse(result);
            externalId = parsed?.id ?? parsed?.post_id ?? undefined;
          } catch { /* ignore parse errors */ }
          // Mark as published
          await db.update(socialPosts)
            .set({ status: "published", publishedAt: new Date(), externalPostId: externalId })
            .where(eq(socialPosts.id, input.id));
          return { ok: true, externalId };
        } catch (err: any) {
          // Mark as failed
          await db.update(socialPosts)
            .set({ status: "failed" })
            .where(eq(socialPosts.id, input.id));
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err?.message ?? "Failed to publish to Instagram" });
        }
      }),

    // Admin: get all posts stats
    adminStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { total: 0, published: 0, scheduled: 0, failed: 0 };
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(socialPosts);
      const [published] = await db.select({ count: sql<number>`count(*)` }).from(socialPosts).where(eq(socialPosts.status, "published"));
      const [scheduled] = await db.select({ count: sql<number>`count(*)` }).from(socialPosts).where(eq(socialPosts.status, "scheduled"));
      const [failed] = await db.select({ count: sql<number>`count(*)` }).from(socialPosts).where(eq(socialPosts.status, "failed"));
      return {
        total: Number(total?.count ?? 0),
        published: Number(published?.count ?? 0),
        scheduled: Number(scheduled?.count ?? 0),
        failed: Number(failed?.count ?? 0),
      };
    }),
  }),

  // ── Intelligence Engine ──────────────────────────────────────────────────────
  intelligence: router({
    getScan: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getLatestIntelligence } = await import("./intelligenceEngine");
      return getLatestIntelligence();
    }),
  }),

});
export type AppRouter = typeof appRouter;
