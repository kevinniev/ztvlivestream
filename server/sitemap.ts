import type { Express, Request, Response, NextFunction } from "express";
import { getDb } from "./db";
import { videos } from "../drizzle/schema";

// Use APP_URL env var for production; fall back to canonical domain (non-www)
const BASE_URL = "https://ztvlivestream.com";

const STATIC_URLS = [
  // Core pages — highest priority
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/live", priority: "0.9", changefreq: "always" },
  { loc: "/library", priority: "0.9", changefreq: "hourly" },
  { loc: "/quiz", priority: "0.8", changefreq: "daily" },
  { loc: "/schedule", priority: "0.8", changefreq: "hourly" },
  // Creator
  { loc: "/creator", priority: "0.8", changefreq: "weekly" },
  { loc: "/creator/rights", priority: "0.5", changefreq: "monthly" },
  // Subscription
  { loc: "/subscribe", priority: "0.8", changefreq: "weekly" },
  // Auth (indexable for SEO — sign-in/sign-up pages help with brand searches)
  { loc: "/signin", priority: "0.5", changefreq: "monthly" },
  { loc: "/signup", priority: "0.6", changefreq: "monthly" },
  // Legal & trust
  { loc: "/terms", priority: "0.4", changefreq: "monthly" },
  { loc: "/privacy", priority: "0.4", changefreq: "monthly" },
  { loc: "/dmca", priority: "0.4", changefreq: "monthly" },
  { loc: "/content-guidelines", priority: "0.5", changefreq: "monthly" },
  { loc: "/community-guidelines", priority: "0.5", changefreq: "monthly" },
  { loc: "/ad-policy", priority: "0.4", changefreq: "monthly" },
];

// Old /stream/ URLs from previous platform → 301 redirect to new /watch/ or /library
const LEGACY_REDIRECTS: Record<string, string> = {
  "/stream/zazueta-vs-ikei": "/library",
  "/stream/the-arizona-super-show-2021": "/library",
  "/stream/mc-magic-live-concert-2019": "/library",
  "/stream/owens-vs-foster": "/library",
  "/stream/hitzz": "/library",
  "/stream/the-zapp-band-concert-2019": "/library",
  "/stream/gomez-vs-llanez": "/library",
  "/category/pay-per-view": "/subscribe",
  "/watch/stream/million-dollar-mingle-luxury-polo-event-2020-interview-with-sheldon-bailey-beverly-peele1080p": "/library",
  "/register": "/signup",
};

function buildSitemap(staticUrls: typeof STATIC_URLS, videoUrls: { loc: string; lastmod: string; title: string; description: string; thumbnailUrl: string }[] = []): string {
  const now = new Date().toISOString().split("T")[0];
  const staticEntries = staticUrls
    .map(
      (u) => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  const videoEntries = videoUrls
    .map(
      (v) => `  <url>
    <loc>${BASE_URL}${v.loc}</loc>
    <lastmod>${v.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <video:video>
      <video:thumbnail_loc>${v.thumbnailUrl}</video:thumbnail_loc>
      <video:title><![CDATA[${v.title}]]></video:title>
      <video:description><![CDATA[${v.description}]]></video:description>
    </video:video>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${staticEntries}
${videoEntries}
</urlset>`;
}

export function registerSitemapRoute(app: Express) {
  // ── 1. www → non-www canonical redirect (fixes "Alternate page with proper canonical tag" issue)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.headers.host || "";
    if (host.startsWith("www.")) {
      const nonWwwHost = host.replace(/^www\./, "");
      const redirectUrl = `https://${nonWwwHost}${req.originalUrl}`;
      return res.redirect(301, redirectUrl);
    }
    next();
  });

  // ── 2. Legacy /stream/ and /category/ URL redirects (fixes "Crawled - currently not indexed" + "Page with redirect" issues)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const redirect = LEGACY_REDIRECTS[path];
    if (redirect) {
      return res.redirect(301, redirect);
    }
    // Also handle /stream/* catch-all
    if (path.startsWith("/stream/") || path.startsWith("/category/")) {
      return res.redirect(301, "/library");
    }
    next();
  });

  // ── 3. Sitemap with dynamic video URLs
  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const drizzle = await getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const videoList = await drizzle.select().from(videos).limit(50);
      const videoUrls = videoList.map((v: typeof videos.$inferSelect) => ({
        loc: `/watch/${v.id}`,
        lastmod: v.publishedAt ? new Date(v.publishedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        title: v.title,
        description: v.description || `Watch ${v.title} on ZTVLIVE`,
        thumbnailUrl: v.thumbnailUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-primary-hG5E4F9vWfzRrbzJS8nAVW.png",
      }));

      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(buildSitemap(STATIC_URLS, videoUrls));
    } catch {
      // Fallback to static-only sitemap
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(buildSitemap(STATIC_URLS));
    }
  });
}
