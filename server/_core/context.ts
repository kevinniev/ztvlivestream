import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // ── Path 1: Passport session (Google/Facebook OAuth via express-session)
    // After passport.authenticate() succeeds, passport.session() middleware
    // calls deserializeUser() and populates req.user on every subsequent request.
    if ((opts.req as any).user) {
      user = (opts.req as any).user as User;
    }

    // ── Path 2: Manual session.userId (email/password login)
    if (!user) {
      const sessionUserId = (opts.req as any).session?.userId;
      if (sessionUserId) {
        const db = await getDb();
        if (db) {
          const result = await db
            .select()
            .from(users)
            .where(eq(users.id, sessionUserId))
            .limit(1);
          user = result[0] || null;
        }
      }
    }

    // ── Path 3: Manus JWT session token (Manus OAuth flow via /api/oauth/callback)
    // The Manus OAuth writes a signed JWT directly to the cookie.
    // We try to verify it and look up the user by openId.
    if (!user) {
      try {
        user = await sdk.authenticateRequest(opts.req) as User;
      } catch {
        // Not a valid Manus session — that's fine, just means user isn't logged in via Manus OAuth
        user = null;
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
