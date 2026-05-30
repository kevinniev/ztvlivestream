import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
    // Session-based auth: check for userId in session
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
    // Also check passport user (for OAuth flows)
    if (!user && (opts.req as any).user) {
      user = (opts.req as any).user as User;
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
