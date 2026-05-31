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
  users,
} from "../drizzle/schema";
import { eq, desc, and, like, inArray, sql } from "drizzle-orm";
import {
  sendWelcomeEmail,
  sendCreatorApplicationEmail,
} from "./email";

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

        let query = db.select().from(videos).$dynamic();

        if (input.category && input.category !== "all") {
          query = query.where(eq(videos.category, input.category as any));
        }
        if (input.search) {
          query = query.where(like(videos.title, `%${input.search}%`));
        }

        const items = await query
          .orderBy(desc(videos.publishedAt))
          .limit(input.limit)
          .offset(input.offset);

        return { items };
      }),

    featured: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(videos).where(eq(videos.isFeatured, true)).limit(5);
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  /* ── Live Stats ───────────────────────────────────────── */
  live: router({
    viewerCount: publicProcedure.query(() => {
      // Simulated live viewer count (in production, this would come from a real-time service)
      const base = 1200;
      const variance = Math.floor(Math.random() * 400);
      return { count: base + variance, liveVideoId: "jfKfPfyJRdk" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
