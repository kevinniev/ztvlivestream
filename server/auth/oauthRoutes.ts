import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

export function setupPassport() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
  const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "";
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
  // Use APP_URL env var (set to the public domain) so callbacks work correctly
  // behind reverse proxies and Cloud Run. Falls back to relative path for local dev.
  const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const db = await getDb();
      if (!db) return done(null, false);
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, result[0] || false);
    } catch (err) {
      done(err, false);
    }
  });

  // Google OAuth Strategy
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: APP_URL ? `${APP_URL}/api/auth/google/callback` : "/api/auth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const db = await getDb();
            if (!db) return done(new Error("Database unavailable"), undefined);

            const email = profile.emails?.[0]?.value;
            const avatar = profile.photos?.[0]?.value;
            const name = profile.displayName;
            const providerId = profile.id;

            // Find existing user by providerId or email
            let existing = await db
              .select()
              .from(users)
              .where(eq(users.providerId, providerId))
              .limit(1);

            if (existing.length === 0 && email) {
              existing = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
            }

            if (existing.length > 0) {
              // Update avatar and lastSignedIn
              await db
                .update(users)
                .set({ avatar: avatar || existing[0].avatar, providerId, provider: "google", lastSignedIn: new Date() })
                .where(eq(users.id, existing[0].id));
              return done(null, existing[0]);
            }

            // Create new user
            const openId = `google_${providerId}`;
            await db.insert(users).values({
              openId,
              name,
              email: email || null,
              provider: "google",
              providerId,
              avatar: avatar || null,
              emailVerified: true,
              role: "user",
              subscriptionTier: "free",
              lastSignedIn: new Date(),
            });

            const newUser = await db
              .select()
              .from(users)
              .where(eq(users.openId, openId))
              .limit(1);

            return done(null, newUser[0]);
          } catch (err) {
            return done(err as Error, undefined);
          }
        }
      )
    );
  }

  // Facebook OAuth Strategy
  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: FACEBOOK_APP_ID,
          clientSecret: FACEBOOK_APP_SECRET,
          callbackURL: APP_URL ? `${APP_URL}/api/auth/facebook/callback` : "/api/auth/facebook/callback",
          profileFields: ["id", "displayName", "photos", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const db = await getDb();
            if (!db) return done(new Error("Database unavailable"), undefined);

            const email = profile.emails?.[0]?.value;
            const avatar = profile.photos?.[0]?.value;
            const name = profile.displayName;
            const providerId = profile.id;

            let existing = await db
              .select()
              .from(users)
              .where(eq(users.providerId, providerId))
              .limit(1);

            if (existing.length === 0 && email) {
              existing = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
            }

            if (existing.length > 0) {
              await db
                .update(users)
                .set({ avatar: avatar || existing[0].avatar, providerId, provider: "facebook", lastSignedIn: new Date() })
                .where(eq(users.id, existing[0].id));
              return done(null, existing[0]);
            }

            const openId = `facebook_${providerId}`;
            await db.insert(users).values({
              openId,
              name,
              email: email || null,
              provider: "facebook",
              providerId,
              avatar: avatar || null,
              emailVerified: !!email,
              role: "user",
              subscriptionTier: "free",
              lastSignedIn: new Date(),
            });

            const newUser = await db
              .select()
              .from(users)
              .where(eq(users.openId, openId))
              .limit(1);

            return done(null, newUser[0]);
          } catch (err) {
            return done(err as Error, undefined);
          }
        }
      )
    );
  }
}

export function createOAuthRouter(): express.Router {
  const router = express.Router();

  // Google OAuth
  router.get(
    "/google",
    (req, res, next) => {
      // Store the return URL from query param
      if (req.query.returnTo) {
        (req.session as any).returnTo = req.query.returnTo;
      }
      next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/signin?error=google_failed" }),
    (req, res) => {
      const returnTo = (req.session as any).returnTo || "/";
      delete (req.session as any).returnTo;
      res.redirect(returnTo as string);
    }
  );

  // Facebook OAuth
  router.get(
    "/facebook",
    (req, res, next) => {
      if (req.query.returnTo) {
        (req.session as any).returnTo = req.query.returnTo;
      }
      next();
    },
    passport.authenticate("facebook", { scope: ["email"] })
  );

  router.get(
    "/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/signin?error=facebook_failed" }),
    (req, res) => {
      const returnTo = (req.session as any).returnTo || "/";
      delete (req.session as any).returnTo;
      res.redirect(returnTo as string);
    }
  );

  // Logout
  router.post("/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("ztvlive_session");
        res.json({ success: true });
      });
    });
  });

  return router;
}
