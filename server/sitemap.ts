import type { Express } from "express";

// Use APP_URL env var for production; fall back to canonical domain
const BASE_URL = (process.env.APP_URL || "https://ztvlivestream.com").replace(/\/$/, "");

const STATIC_URLS = [
  // Core pages
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
  // Legal & trust
  { loc: "/terms", priority: "0.4", changefreq: "monthly" },
  { loc: "/privacy", priority: "0.4", changefreq: "monthly" },
  { loc: "/dmca", priority: "0.4", changefreq: "monthly" },
  { loc: "/content-guidelines", priority: "0.5", changefreq: "monthly" },
  { loc: "/community-guidelines", priority: "0.5", changefreq: "monthly" },
  { loc: "/ad-policy", priority: "0.4", changefreq: "monthly" },
];

function buildSitemap(urls: typeof STATIC_URLS): string {
  const now = new Date().toISOString().split("T")[0];
  const urlEntries = urls
    .map(
      (u) => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urlEntries}
</urlset>`;
}

export function registerSitemapRoute(app: Express) {
  app.get("/sitemap.xml", (_req, res) => {
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buildSitemap(STATIC_URLS));
  });
}
