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
import { creatorScoutHandler } from "../scheduledHandlers";

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
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // ── Hard 404 for garbage/invalid paths ──
  // These must be registered as explicit GET routes BEFORE serveStatic/setupVite
  // so Express matches them before the wildcard SPA fallback.
  // Using app.get() (not app.use()) ensures exact path matching.
  const HARD_404_ROUTES = [
    "/undefined", "/null", "/watch/undefined", "/watch/null", "/watch/NaN", "/watch/0",
  ];
  for (const p of HARD_404_ROUTES) {
    app.get(p, (_req, res) => {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send(
        `<!DOCTYPE html><html><head><title>404 Not Found | ZTVLIVE</title><meta name="robots" content="noindex,nofollow"></head><body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p><a href="/">Go to ZTVLIVE</a></body></html>`
      );
    });
  }

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
