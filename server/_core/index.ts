import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import session from "express-session";
import passport from "passport";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerSitemapRoute } from "../sitemap";
import { stripeWebhookHandler } from "../stripe/webhook";
import { setupPassport, createOAuthRouter } from "../auth/oauthRoutes";
import { creatorScoutHandler, creatorOutreachHandler } from "../scheduledHandlers";
import { zaraDailyHandler, zoeWeeklyHandler, renderCheckHandler } from "../pipelineHandlers";
import { niaEpisodeHandler } from "../niaEpisodeHandler";
import { weeklyReportHandler } from "../weeklyReport";
import { xMorningLineupHandler, xAfternoonPostHandler } from "../xPostHandlers";
import { fbMorningPostHandler, fbAfternoonPostHandler, fbViralPostHandler, fbNotificationReminderHandler } from "../fbPostHandlers";
import { socialListeningHandler } from "../socialListeningHandler";
import fbGroupPostRouter from "../fbGroupPostHandler";
import { intelligenceEngineHandler } from "../intelligenceEngine";
import { linkedinTuesdayPostHandler, linkedinFridayPostHandler } from "../linkedinPostHandler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust the first proxy (Cloud Run / Manus infra) so that:
  // 1. req.secure is true when X-Forwarded-Proto is https
  // 2. Secure cookies are set correctly in production
  // 3. req.ip reflects the real client IP via X-Forwarded-For
  app.set('trust proxy', 1);
  // Force www → non-www redirect — canonical is non-www per hosting config
  // NOTE: In production (Cloud Run), the real hostname comes via X-Forwarded-Host,
  // not the Host header (which is typically localhost:PORT internally).
  app.use((req, res, next) => {
    const forwardedHost = (req.headers["x-forwarded-host"] as string) || "";
    const host = (forwardedHost || req.headers.host || "").toLowerCase().split(",")[0].trim();
    // Redirect www → non-www in production (canonical is non-www)
    if (
      process.env.NODE_ENV === "production" &&
      (host === "www.ztvlivestream.com" || host === "www.ztvlivestream.com:443")
    ) {
      return res.redirect(301, `https://ztvlivestream.com${req.originalUrl}`);
    }
    next();
  });

  // ── Security headers (applied to all responses)
  app.use((_req, res, next) => {
    // Prevent clickjacking — allow embedding only from same origin
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // Prevent MIME type sniffing (already set by Manus infra, but belt-and-suspenders)
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Control referrer information sent with requests
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Restrict browser features not needed by the app
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
    next();
  });

  // Stripe webhook MUST use raw body — register BEFORE express.json()
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Session middleware
  app.use(
    session({
      name: "ztvlive_session",
      secret: process.env.JWT_SECRET || "ztvlive-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // In production (Cloud Run), trust proxy is set so req.secure works.
        // Use secure:true + sameSite:'none' for cross-origin cookie support.
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        // Do NOT set domain — let the browser use the request domain automatically.
        // Setting domain explicitly can prevent cookies from being set on subdomains.
      },
    })
  );

  // Passport OAuth
  setupPassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Public OAuth routes
  app.use("/api/auth", createOAuthRouter());

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerSitemapRoute(app);
  // Scheduled heartbeat handlers (must be before tRPC)
  app.post("/api/scheduled/creator-scout", creatorScoutHandler);
  app.post("/api/scheduled/creator-outreach", creatorOutreachHandler); // Weekly Monday 10am MST — GitHub Actions triggered
  // Content pipeline handlers
  app.post("/api/scheduled/zara-daily", zaraDailyHandler);
  app.post("/api/scheduled/zoe-weekly", zoeWeeklyHandler);
  app.post("/api/scheduled/render-check", renderCheckHandler);
  // Nia CommunityCut Weekly episode auto-publisher (Thursday AGENT cron)
  app.post("/api/scheduled/nia-episode", niaEpisodeHandler);
  // Weekly broadcast report — Monday 9:00 AM MST → kevinniev1@gmail.com
  app.post("/api/scheduled/weekly-report", weeklyReportHandler);
  // X/Twitter automated posts — max 2 per day
  app.post("/api/scheduled/x-morning-lineup", xMorningLineupHandler);   // 9am MST daily
  app.post("/api/scheduled/x-afternoon-post", xAfternoonPostHandler);   // 4pm MST daily (trending Mon–Thu, Zoe recap Fri)
  // Facebook automated posts — max 2 per day
  app.post("/api/scheduled/fb-morning-post", fbMorningPostHandler);    // 9am MST daily
  app.post("/api/scheduled/fb-afternoon-post", fbAfternoonPostHandler); // 4pm MST daily
  // Facebook manual triggers — viral post and notification reminder
  app.post("/api/scheduled/fb-viral-post", fbViralPostHandler);         // BET Awards viral post (manual trigger)
  app.post("/api/scheduled/fb-notification-reminder", fbNotificationReminderHandler); // Turn on notifications reminder
  // Facebook Group posts — twice weekly (Tue entertainment, Fri barber)
  app.use("/api/fb-groups", fbGroupPostRouter);
  // Also register as scheduled heartbeat endpoints
  app.post("/api/scheduled/fb-groups-entertainment", (req, res) => {
    req.url = "/post-entertainment";
    fbGroupPostRouter(req, res, () => {});
  });
  app.post("/api/scheduled/fb-groups-barber", (req, res) => {
    req.url = "/post-barber";
    fbGroupPostRouter(req, res, () => {});
  });
  // Social listening engine — every 6 hours
  app.post("/api/scheduled/social-listening", socialListeningHandler);
  // Full intelligence engine — every 6 hours (replaces social-listening with full 8-module scan)
  app.post("/api/scheduled/intelligence-engine", intelligenceEngineHandler);
  // LinkedIn automated posts — twice weekly
  app.post("/api/scheduled/linkedin-tuesday-post", linkedinTuesdayPostHandler); // Tue 10am MST (17:00 UTC)
  app.post("/api/scheduled/linkedin-friday-post", linkedinFridayPostHandler);   // Fri 10am MST (17:00 UTC)

  // ── Warm-up / health check endpoints ──
  // Cloud Run sends GET /_ah/warmup on instance startup — respond immediately
  // to prevent cold start timeouts that block Googlebot crawls.
  // Also used by uptime monitors and the admin dashboard's stream health check.
  app.get("/_ah/warmup", (_req, res) => {
    res.status(200).json({ status: "warm", ts: Date.now() });
  });
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", ts: Date.now(), env: process.env.NODE_ENV });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // ── Hard 404 for garbage/invalid paths ──
  // Must intercept BEFORE serveStatic/setupVite (which has the SPA wildcard fallback)
  const HARD_404_PATHS = new Set([
    "/undefined", "/null", "/watch/undefined", "/watch/null", "/watch/NaN", "/watch/0",
  ]);
  // Use app.use() (not app.get()) — it runs before static middleware for exact paths
  app.use((req, res, next) => {
    if (HARD_404_PATHS.has(req.path)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).send(
        `<!DOCTYPE html><html><head><title>404 Not Found | ZTVLIVE</title><meta name="robots" content="noindex,nofollow"></head><body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p><a href="/">Go to ZTVLIVE</a></body></html>`
      );
    }
    next();
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
