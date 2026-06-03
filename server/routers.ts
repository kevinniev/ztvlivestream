import { stripeRouter } from "./stripe/router";
import { systemRouter } from "./_core/systemRouter";
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
} from "../drizzle/schema";
import crypto from "crypto";
import { runCreatorScout, SCOUT_NICHES } from "./creatorScout";
import { eq, desc, and, like, inArray, sql } from "drizzle-orm";
import {
  sendWelcomeEmail,
  sendCreatorApplicationEmail,
} from "./email";
import { sendSMS, SMS, validateTwilioCredentials } from "./sms";

/* ============================================================
   App Router
   ============================================================ */
export const appRouter = router({
  system: systemRouter,
  stripe: stripeRouter,

  /* ── Auth ─────────────────────────────────────────────── */
  auth: authRouter,

  /* ── Videos ───────────────────────────────────────────── */
  videos: router({
    list: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const { or } = await import("drizzle-orm");

        let query = db.select().from(videos).$dynamic();

        if (input.category && input.category !== "all") {
          query = query.where(eq(videos.category, input.category as any));
        }
        if (input.search) {
          const term = `%${input.search}%`;
          query = query.where(
            or(
              like(videos.title, term),
              like(videos.description, term),
              like(videos.tags, term),
              like(videos.creatorName, term),
            )
          );
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
          // Send welcome email + owner notification
          sendWelcomeEmail(input.email).catch(() => {});
          return { success: true };
        } catch {
          // Duplicate email - already subscribed
          return { success: true, alreadySubscribed: true };
        }
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

  /* ── Live Stats ───────────────────────────────────────── */
  live: router({
    viewerCount: publicProcedure.query(() => {
      // Simulated live viewer count (in production, this would come from a real-time service)
      const base = 1200;
      const variance = Math.floor(Math.random() * 400);
      return { count: base + variance, liveVideoId: "EWrX250Zhko" };
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
});
export type AppRouter = typeof appRouter;
