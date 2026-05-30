import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

export const authRouter = router({
  /** Register with email + password */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(64),
        email: z.string().email(),
        password: z.string().min(6).max(128),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if email already exists
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        provider: "email",
        emailVerified: false,
        role: "user",
        subscriptionTier: "free",
        lastSignedIn: new Date(),
      });

      const newUser = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!newUser[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });

      // Set session
      (ctx.req as any).session = (ctx.req as any).session || {};
      (ctx.req as any).session.userId = newUser[0].id;

      return { success: true, user: { id: newUser[0].id, name: newUser[0].name, email: newUser[0].email, avatar: newUser[0].avatar, role: newUser[0].role, subscriptionTier: newUser[0].subscriptionTier } };
    }),

  /** Login with email + password */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      const user = result[0];
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      if (!user.passwordHash) {
        // User signed up with OAuth — guide them
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `This account was created with ${user.provider === "google" ? "Google" : "Facebook"}. Please sign in using that method.`,
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      // Update lastSignedIn
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // Set session
      (ctx.req as any).session.userId = user.id;

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
        },
      };
    }),

  /** Get current session user */
  me: publicProcedure.query(async ({ ctx }) => {
    // Use ctx.user if already populated (e.g. in tests or via passport)
    if (ctx.user) {
      const user = ctx.user;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        provider: user.provider,
      };
    }
    // Fall back to session lookup
    const sessionUserId = (ctx.req as any).session?.userId;
    if (!sessionUserId) return null;

    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(users).where(eq(users.id, sessionUserId)).limit(1);
    const user = result[0];
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      provider: user.provider,
    };
  }),

  /** Logout */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const req = ctx.req as any;
    if (req.session) {
      req.session.destroy?.(() => {});
      req.session.userId = undefined;
    }
    ctx.res.clearCookie("ztvlive_session", {
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
    return { success: true };
  }),

  /** Update profile */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(64).optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.avatar) updates.avatar = input.avatar;

      await db.update(users).set(updates).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
});
