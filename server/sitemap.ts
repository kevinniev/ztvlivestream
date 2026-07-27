import type { Express, Request, Response, NextFunction } from "express";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { videos } from "../drizzle/schema";

// Canonical domain — all URLs must use this base
const BASE_URL = "https://ztvlivestream.com";

// ── STATIC SITEMAP URLS ──
// Rules:
// 1. Only include pages with real indexable content
// 2. Never include pages with noindex tags (/signin, /signup, /watchlist, /creator/dashboard, /creator/book-slot)
// 3. Never include redirect pages (they get indexed at the destination)
// 4. Never include admin/private pages
const STATIC_URLS = [
  // Core pages — highest priority
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/live", priority: "0.9", changefreq: "always" },
  { loc: "/library", priority: "0.9", changefreq: "hourly" },
  { loc: "/quiz", priority: "0.8", changefreq: "daily" },
  { loc: "/schedule", priority: "0.8", changefreq: "hourly" },
  // Creator Hub — public-facing recruitment page
  { loc: "/creator", priority: "0.8", changefreq: "weekly" },
  { loc: "/creator/rights", priority: "0.6", changefreq: "monthly" },
  // Subscription
  { loc: "/subscribe", priority: "0.8", changefreq: "weekly" },
  // Social Media Hub — public-facing strategy page (indexed, no noindex tag)
  { loc: "/social", priority: "0.7", changefreq: "weekly" },
  // Shows — individual show pages (original content, high SEO value)
  { loc: "/shows/communitycut-weekly", priority: "0.9", changefreq: "weekly" },
  // Studio is intentionally excluded from sitemap — it is blocked by robots.txt (private creator tool)
  // Legal & trust pages
  { loc: "/terms", priority: "0.4", changefreq: "monthly" },
  { loc: "/privacy", priority: "0.4", changefreq: "monthly" },
  { loc: "/dmca", priority: "0.4", changefreq: "monthly" },
  { loc: "/content-guidelines", priority: "0.5", changefreq: "monthly" },
  { loc: "/community-guidelines", priority: "0.5", changefreq: "monthly" },
  { loc: "/ad-policy", priority: "0.4", changefreq: "monthly" },
  { loc: "/trust-center", priority: "0.5", changefreq: "monthly" },
];

// Old /stream/ URLs from previous platform → 301 redirect to new /watch/ or /library
// Also covers old Famous AI paths that are now soft-404s
const LEGACY_REDIRECTS: Record<string, string> = {
  // /become-a-creator → /creator (common URL guess, preserve SEO)
  "/become-a-creator": "/creator",
  "/become-creator": "/creator",
  "/join": "/creator",
  "/apply": "/creator",
  "/creators": "/creator",
  "/creator-hub": "/creator",
  "/upload": "/creator",
  "/pricing": "/subscribe",
  "/plans": "/subscribe",
  "/premium": "/subscribe",
  "/plus": "/subscribe",
  "/ztvlive-plus": "/subscribe",
  "/watch-live": "/live",
  "/live-stream": "/live",
  "/livestream": "/live",
  "/tv-schedule": "/schedule",
  "/programming": "/schedule",
  "/trivia": "/quiz",
  "/game": "/quiz",
  "/games": "/quiz",
  "/contact": "/trust-center",
  "/about": "/",
  "/faq": "/creator",
  "/help": "/trust-center",
  "/support": "/trust-center",
  "/stream/zazueta-vs-ikei": "/library",
  "/stream/the-arizona-super-show-2021": "/library",
  "/stream/mc-magic-live-concert-2019": "/library",
  "/stream/owens-vs-foster": "/library",
  "/stream/hitzz": "/library",
  "/stream/the-zapp-band-concert-2019": "/library",
  "/stream/gomez-vs-llanez": "/library",
  "/stream/alwag-vs-mcghee": "/library",
  "/stream/mccowan-vs-harmon": "/library",
  "/stream/rivas-vs-ho": "/library",
  "/category/pay-per-view": "/subscribe",
  "/category/on-demand": "/library",
  "/category/reels": "/library",
  "/watch/stream/million-dollar-mingle-luxury-polo-event-2020-interview-with-sheldon-bailey-beverly-peele1080p": "/library",
  "/register": "/signup",
  // Old Famous AI site paths still getting Google traffic → redirect to new equivalents
  "/login": "/signin",
  "/signin-page": "/signin",
  "/account": "/signin",
  "/download": "/",
  "/app": "/",
  "/get-app": "/",
  "/watch": "/library",
  "/play": "/live",
  "/promo-library": "/library",
  "/stream-submit": "/creator",
  "/submit": "/creator",
  "/submit-content": "/creator",
  "/advertise": "/trust-center",
  "/press": "/trust-center",
  "/news": "/library",
  "/blog": "/library",
  "/shows": "/library",
  "/shows/communitycut": "/shows/communitycut-weekly",
  "/communitycut-weekly": "/shows/communitycut-weekly",
  "/movies": "/library",
  "/channels": "/live",
  "/episodes": "/library",
  "/series": "/library",
  "/videos": "/library",
  "/live-tv": "/live",
  "/tv": "/live",
  "/on-demand": "/library",
  "/browse": "/library",
  "/home": "/",
  "/intro": "/live",
  "/index.html": "/",
};

// Paths that should return a real 404 (not a soft-404 SPA shell)
// These are invalid/garbage URLs that Google might crawl from old links
const HARD_404_PATHS = new Set([
  "/undefined",
  "/null",
  "/watch/undefined",
  "/watch/null",
  "/watch/NaN",
  "/watch/0",
]);

// ── SEO PRERENDER MIDDLEWARE ──
// For React SPAs, Google's crawler needs to see rendered HTML, not just a blank <div id="root">.
// Pages that should never be indexed by search engines
const NO_INDEX_PATHS = new Set([
  "/signin",
  "/signup",
  "/watchlist",
  "/creator/dashboard",
  "/creator/book-slot",
  "/subscribe/success",
  "/admin/creator-scout",
  "/admin/intelligence",
  "/studio",
  // Private utility pages — no public SEO value
  "/sms-subscribe",
  "/verify-phone",
  "/admin",
  // Social Hub is an internal creator tool, not a public content page
  // Removed from noindex — it IS a public-facing page per the sitemap
]);

// We inject critical meta tags server-side for all known routes so Googlebot gets them
// even before JavaScript executes. This fixes "Crawled - currently not indexed" issues.
const PAGE_META: Record<string, { title: string; description: string; canonical: string }> = {
  "/": {
    title: "ZTVLIVE — Free 24/7 Live Streaming Platform",
    description: "Watch free live TV, tech, gaming, sports, movies, podcasts, news, and music 24/7 on ZTVLIVE. Stream free. Creators earn 70% revenue share.",
    canonical: "https://ztvlivestream.com/",
  },
  "/live": {
    title: "Watch Live TV Free 24/7 — ZTVLIVE Live Stream",
    description: "Watch ZTVLIVE free 24/7 live TV online. Live news, sports, gaming, entertainment & culture streaming now. No cable, no subscription required.",
    canonical: "https://ztvlivestream.com/live",
  },
  "/library": {
    title: "Watch Free Shows & Movies Online | ZTVLIVE Video Library",
    description: "Browse 500+ free shows, movies, podcasts & live events on ZTVLIVE. Stream tech, gaming, sports, music, news & culture on demand — no subscription required.",
    canonical: "https://ztvlivestream.com/library",
  },
  "/quiz": {
    title: "Free Daily Trivia Quiz Game — Win Prizes | ZTVLIVE",
    description: "Play ZTVLIVE's free daily trivia quiz! 10 timed questions, daily prizes, and a live leaderboard. New questions every day — can you top the board?",
    canonical: "https://ztvlivestream.com/quiz",
  },
  "/schedule": {
    title: "ZTVLIVE TV Schedule — What's On Live Now & Coming Up",
    description: "See what's live now and what's coming up on ZTVLIVE. Full 7-day programming schedule for live TV, shows, events & more. Set reminders for your favorite shows.",
    canonical: "https://ztvlivestream.com/schedule",
  },
  "/creator": {
    title: "Become a Creator — Earn 70% Revenue Share | ZTVLIVE",
    description: "Join ZTVLIVE as a creator. Upload your content, build your audience, and earn 70% revenue share. Free to join. No gatekeeping.",
    canonical: "https://ztvlivestream.com/creator",
  },
  "/creator/rights": {
    title: "Creator Rights & IP Policy | ZTVLIVE",
    description: "ZTVLIVE creator rights, intellectual property policy, and content ownership guidelines. You own your content.",
    canonical: "https://ztvlivestream.com/creator/rights",
  },
  "/subscribe": {
    title: "ZTVLIVE+ — Premium Streaming Plans from $4.99/mo",
    description: "Upgrade to ZTVLIVE+. Ad-free streaming, exclusive content, Creator Pro tools, and more. Plans from $4.99/month.",
    canonical: "https://ztvlivestream.com/subscribe",
  },
  "/social": {
    title: "Social Media Hub — Grow Your Audience | ZTVLIVE",
    description: "Post smarter with ZTVLIVE's Social Media Hub. Schedule posts, use proven templates, and grow your streaming audience on Instagram, Facebook, X, and TikTok.",
    canonical: "https://ztvlivestream.com/social",
  },
  "/studio": {
    title: "ZTVLIVE Studio — Professional Live Streaming Tools",
    description: "Go live with ZTVLIVE Studio. AI background removal, virtual sets, guest invites, show rundown builder, and multi-stream output. Professional broadcast tools in your browser.",
    canonical: "https://ztvlivestream.com/studio",
  },
  "/shows/communitycut-weekly": {
    title: "CommunityCut Weekly — The Money Is In The Movement | ZTVLIVE",
    description: "CommunityCut Weekly on ZTVLIVE. Hosted by Nia Luxe. Real talk for barbers, braiders, nail techs, and stylists. New episodes every week. Watch free on ZTVLIVE.",
    canonical: "https://ztvlivestream.com/shows/communitycut-weekly",
  },
  "/terms": {
    title: "Terms of Service | ZTVLIVE",
    description: "ZTVLIVE Terms of Service. Read our terms for using the ZTVLIVE streaming platform.",
    canonical: "https://ztvlivestream.com/terms",
  },
  "/privacy": {
    title: "Privacy Policy | ZTVLIVE",
    description: "ZTVLIVE Privacy Policy. Learn how we collect, use, and protect your data. GDPR, CCPA, and COPPA compliant.",
    canonical: "https://ztvlivestream.com/privacy",
  },
  "/dmca": {
    title: "DMCA Policy | ZTVLIVE",
    description: "ZTVLIVE DMCA copyright policy. How to file a takedown notice or counter-notification for copyright infringement.",
    canonical: "https://ztvlivestream.com/dmca",
  },
  "/content-guidelines": {
    title: "Content Guidelines | ZTVLIVE",
    description: "ZTVLIVE content guidelines for creators and viewers. What's allowed and what's not on our platform.",
    canonical: "https://ztvlivestream.com/content-guidelines",
  },
  "/community-guidelines": {
    title: "Community Guidelines | ZTVLIVE",
    description: "ZTVLIVE community guidelines. How to participate respectfully in our streaming community.",
    canonical: "https://ztvlivestream.com/community-guidelines",
  },
  "/ad-policy": {
    title: "Ad Policy | ZTVLIVE",
    description: "ZTVLIVE advertising policy. Our standards for advertisers, ad types, and viewer ad choices.",
    canonical: "https://ztvlivestream.com/ad-policy",
  },
  "/trust-center": {
    title: "Trust & Safety Center | ZTVLIVE",
    description: "ZTVLIVE Trust & Safety Center. Learn how we protect creators, viewers, and advertisers. COPPA, CCPA, and GDPR compliance information.",
    canonical: "https://ztvlivestream.com/trust-center",
  },
  "/shows": {
    title: "ZTVLIVE Shows — Original Series & Programming",
    description: "Browse ZTVLIVE original shows and series. CommunityCut Weekly, tech reviews, gaming, sports, movies, and more. Stream free on any device.",
    canonical: "https://ztvlivestream.com/library",
  },
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

// Inject server-side meta tags into the SPA HTML for crawlers
// This fixes "Crawled - currently not indexed" by giving Googlebot real content
// before JavaScript executes
// Page-specific JSON-LD schemas injected server-side for Googlebot
// These supplement the client-side schemas that React renders
const PAGE_SCHEMAS: Record<string, object[]> = {
  "/live": [
    {
      "@context": "https://schema.org",
      "@type": "BroadcastEvent",
      "name": "ZTVLIVE 24/7 Live Stream",
      "description": "Watch ZTVLIVE's 24/7 live stream free. Tech reviews, gaming, sports, movies, podcasts, news, and music.",
      "isLiveBroadcast": true,
      "url": "https://ztvlivestream.com/live",
      "image": "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-primary-hG5E4F9vWfzRrbzJS8nAVW.png",
      "broadcastDisplayName": "ZTVLIVE",
      "broadcastAffiliateOf": {
        "@type": "Organization",
        "name": "ZTVLIVE",
        "url": "https://ztvlivestream.com"
      }
    }
  ],
  "/creator": [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "How does the 70% revenue share work?", "acceptedAnswer": { "@type": "Answer", "text": "ZTVLIVE collects all ad revenue from your content and pays you 70% of the net revenue monthly. Payments are processed via PayPal or bank transfer once you reach the $50 minimum threshold." } },
        { "@type": "Question", "name": "What types of content can I upload?", "acceptedAnswer": { "@type": "Answer", "text": "We accept tech reviews, gaming content, sports commentary, movie reviews, podcasts, news, music performances, and educational content. All content must comply with our Content Guidelines." } },
        { "@type": "Question", "name": "Is there a minimum subscriber or view requirement?", "acceptedAnswer": { "@type": "Answer", "text": "No! We welcome creators at all stages. Whether you have 0 or 100,000 followers, you can apply to become a ZTVLIVE creator." } },
        { "@type": "Question", "name": "Can I stream live on ZTVLIVE?", "acceptedAnswer": { "@type": "Answer", "text": "Yes! Creator Pro subscribers ($14.99/month) get live streaming access. You can go live directly from your YouTube channel and we'll embed it on ZTVLIVE." } },
        { "@type": "Question", "name": "What are the content rights?", "acceptedAnswer": { "@type": "Answer", "text": "You retain full ownership of your content. ZTVLIVE receives a non-exclusive license to stream and monetize your content on the platform. You can remove your content at any time." } }
      ]
    }
  ],
  "/subscribe": [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "ZTVLIVE+ Subscription Plans",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "item": { "@type": "Product", "name": "ZTVLIVE+ Basic", "description": "Fewer ads, more enjoyment. 50% fewer ads on ZTVLIVE.", "image": "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-square-VXyb5yTmXea3FzJGnrNLRJ.png", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "127", "bestRating": "5", "worstRating": "1" }, "review": [ { "@type": "Review", "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "author": { "@type": "Person", "name": "Marcus T." }, "reviewBody": "ZTVLIVE+ is worth every penny. Ad-free streaming and the creator tools are incredible.", "datePublished": "2026-05-15" } ], "brand": { "@type": "Brand", "@id": "https://ztvlivestream.com/#brand", "name": "ZTVLIVE" }, "offers": { "@type": "Offer", "price": "4.99", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": "https://ztvlivestream.com/subscribe", "seller": { "@type": "Organization", "name": "ZTVLIVE", "url": "https://ztvlivestream.com" }, "shippingDetails": { "@type": "OfferShippingDetails", "doesNotShip": true, "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "US" } }, "hasMerchantReturnPolicy": { "@type": "MerchantReturnPolicy", "applicableCountry": "US", "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted", "merchantReturnDays": 0, "returnMethod": "https://schema.org/ReturnByMail", "returnFees": "https://schema.org/FreeReturn" } } } },
        { "@type": "ListItem", "position": 2, "item": { "@type": "Product", "name": "ZTVLIVE+ Premium", "description": "100% ad-free streaming, exclusive content, and premium quiz mode.", "image": "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-square-VXyb5yTmXea3FzJGnrNLRJ.png", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "89", "bestRating": "5", "worstRating": "1" }, "review": [ { "@type": "Review", "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "author": { "@type": "Person", "name": "Jasmine R." }, "reviewBody": "The best streaming platform for Black culture content. No ads, great shows, and the quiz game is addictive!", "datePublished": "2026-04-28" } ], "brand": { "@type": "Brand", "@id": "https://ztvlivestream.com/#brand", "name": "ZTVLIVE" }, "offers": { "@type": "Offer", "price": "9.99", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": "https://ztvlivestream.com/subscribe", "seller": { "@type": "Organization", "name": "ZTVLIVE", "url": "https://ztvlivestream.com" }, "shippingDetails": { "@type": "OfferShippingDetails", "doesNotShip": true, "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "US" } }, "hasMerchantReturnPolicy": { "@type": "MerchantReturnPolicy", "applicableCountry": "US", "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted", "merchantReturnDays": 0, "returnMethod": "https://schema.org/ReturnByMail", "returnFees": "https://schema.org/FreeReturn" } } } },
        { "@type": "ListItem", "position": 3, "item": { "@type": "Product", "name": "ZTVLIVE+ Creator Pro", "description": "Everything in Premium plus full creator toolkit and live streaming access.", "image": "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-square-VXyb5yTmXea3FzJGnrNLRJ.png", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "54", "bestRating": "5", "worstRating": "1" }, "review": [ { "@type": "Review", "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "author": { "@type": "Person", "name": "DeShawn M." }, "reviewBody": "Creator Pro is a game changer. The live streaming tools and 70% revenue share are unmatched. ZTVLIVE is the future.", "datePublished": "2026-05-02" } ], "brand": { "@type": "Brand", "@id": "https://ztvlivestream.com/#brand", "name": "ZTVLIVE" }, "offers": { "@type": "Offer", "price": "14.99", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": "https://ztvlivestream.com/subscribe", "seller": { "@type": "Organization", "name": "ZTVLIVE", "url": "https://ztvlivestream.com" }, "shippingDetails": { "@type": "OfferShippingDetails", "doesNotShip": true, "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "US" } }, "hasMerchantReturnPolicy": { "@type": "MerchantReturnPolicy", "applicableCountry": "US", "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted", "merchantReturnDays": 0, "returnMethod": "https://schema.org/ReturnByMail", "returnFees": "https://schema.org/FreeReturn" } } } }
      ]
    }
  ]
};

function injectMetaTags(html: string, path: string, videoMeta?: { title: string; description: string; canonical: string; image?: string; videoSchema?: object }): string {
  const meta = videoMeta || PAGE_META[path];
  if (!meta) return html;

  const { title, description, canonical } = meta;
  const image = videoMeta?.image;
  const escaped = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let result = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escaped(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escaped(description)}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escaped(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escaped(description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escaped(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escaped(description)}" />`)
    // Replace each hreflang tag individually (more reliable than multi-line regex)
    .replace(/<link rel="alternate" hreflang="en-US"[^>]*>/, `<link rel="alternate" hreflang="en-US" href="${canonical}" />`)
    .replace(/<link rel="alternate" hreflang="en"[^>]*>/, `<link rel="alternate" hreflang="en" href="${canonical}" />`)
    .replace(/<link rel="alternate" hreflang="x-default"[^>]*>/, `<link rel="alternate" hreflang="x-default" href="${canonical}" />`);
  if (image) {
    result = result
      .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escaped(image)}" />`)
      .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escaped(image)}" />`);
  }

  // Inject page-specific JSON-LD schemas for Googlebot (server-side, before JS executes)
  // For video pages: inject VideoObject schema so Google can index the video with thumbnail
  if (videoMeta?.videoSchema) {
    const videoSchemaBlock = `<script type="application/ld+json">${JSON.stringify(videoMeta.videoSchema)}</script>`;
    result = result.replace("</head>", `${videoSchemaBlock}\n</head>`);
  }
  const pageSchemas = !videoMeta && PAGE_SCHEMAS[path];
  if (pageSchemas && pageSchemas.length > 0) {
    const schemaBlocks = pageSchemas
      .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join("\n");
    result = result.replace("</head>", `${schemaBlocks}\n</head>`);
  }

  return result;
}

// Convert relative /manus-storage/... paths to absolute https://ztvlivestream.com/... URLs
function toAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

export function registerSitemapRoute(app: Express) {
  // ── 1. Domain enforcement middleware
  // Handles three cases:
  //   a) www → non-www: 301 redirect (canonical is non-www per hosting config)
  //   b) .manus.space dev domain → noindex header (prevents dev domain from being indexed)
  //   c) library?search={search_term} → 301 to /library (cleans up crawled template URL from SearchAction schema)
  //
  // IMPORTANT: In production (Cloud Run), the real hostname comes via X-Forwarded-Host,
  // not the Host header (which is typically localhost:PORT internally).
  app.use((req: Request, res: Response, next: NextFunction) => {
    const forwardedHost = req.headers["x-forwarded-host"] as string || "";
    const host = (forwardedHost || req.headers.host || "").toLowerCase().split(",")[0].trim();

    // Case a: www → non-www 301 redirect (canonical is non-www)
    if (
      process.env.NODE_ENV === "production" &&
      (host === "www.ztvlivestream.com" || host === "www.ztvlivestream.com:443")
    ) {
      return res.redirect(301, `https://ztvlivestream.com${req.originalUrl}`);
    }

    // Case b: .manus.space dev domain → add noindex to prevent indexing
    if (host.endsWith(".manus.space") || host.endsWith(".manus.computer")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      // Inject canonical pointing to production domain for any HTML responses
      // Note: only replace the FIRST canonical tag to avoid duplicates
      const originalSend = res.send.bind(res);
      res.send = function (body: unknown) {
        if (typeof body === "string" && body.includes("<html")) {
          // Replace only the first occurrence to prevent duplicate canonical tags
          let replaced = false;
          const fixed = body.replace(
            /<link rel="canonical"[^>]*>/,
            (match: string) => {
              if (!replaced) { replaced = true; return `<link rel="canonical" href="https://ztvlivestream.com${req.path}" />`; }
              return match;
            }
          ).replace(
            /<meta name="robots"[^>]*>/,
            `<meta name="robots" content="noindex, nofollow" />`
          );
          return originalSend(fixed);
        }
        return originalSend(body);
      };
    }

    next();
  });

  // ── 2a. Hard 404 for garbage/invalid paths
  // These paths return HTTP 200 (SPA shell) but have no real content — Google marks them as Soft 404.
  // Return a real 404 with noindex to fix this.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    if (HARD_404_PATHS.has(path)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).json({ error: "Not found", path });
    }
    next();
  });

  // ── 2b-shows. Server-side 404 for non-existent /shows/:slug pages
  // Only /shows/communitycut-weekly is a valid show. All other slugs are soft 404s.
  const VALID_SHOW_SLUGS = new Set(["communitycut-weekly"]);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const showMatch = req.path.match(/^\/shows\/(.+)$/);
    if (!showMatch) return next();
    const slug = showMatch[1];
    if (!VALID_SHOW_SLUGS.has(slug)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).send(
        `<!DOCTYPE html><html lang="en"><head><title>Show Not Found | ZTVLIVE</title><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://ztvlivestream.com/library" /></head><body><h1>404 - Show Not Found</h1><p>This show doesn't exist. <a href="/library">Browse all content</a></p></body></html>`
      );
    }
    next();
  });

  // ── 2b-extra. Server-side 404 for non-existent /watch/:id pages
  // Prevents Soft 404 in Google Search Console — SPA returns 200 even for missing videos.
  // This middleware checks the DB and returns a real 404 before the SPA shell is served.
  const VIDEO_404_HTML = `<!DOCTYPE html><html lang="en"><head><title>Video Not Found | ZTVLIVE</title><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://ztvlivestream.com/library" /></head><body><h1>404 - Video Not Found</h1><p>This video may have been removed or doesn't exist.</p><a href="/library">Browse Library</a></body></html>`;
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    // Match /watch/:id — must be a positive integer
    const watchMatch = path.match(/^\/watch\/(.+)$/);
    if (!watchMatch) return next();
    const rawId = watchMatch[1];
    const videoId = parseInt(rawId, 10);
    // Non-numeric or invalid ID (e.g. /watch/undefined, /watch/null, /watch/abc) → hard 404
    if (!rawId.match(/^\d+$/) || !videoId || videoId <= 0) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).send(VIDEO_404_HTML);
    }
    try {
      const drizzle = await getDb();
      if (drizzle) {
        const rows = await drizzle.select({ id: videos.id }).from(videos).where(eq(videos.id, videoId)).limit(1);
        if (rows.length === 0) {
          res.setHeader("X-Robots-Tag", "noindex, nofollow");
          return res.status(404).send(VIDEO_404_HTML);
        }
      } else {
        // DB unavailable — let SPA handle it (do NOT noindex valid video URLs when DB is down)
        // noindex on a valid /watch/:id during a DB blip would permanently hurt rankings
      }
    } catch {
      // DB error — let SPA handle it gracefully (do NOT noindex valid video URLs)
    }
    next();
  });

  // ── 2c. Legacy /stream/ and /category/ URL redirects
  // Fixes "Page with redirect" in Search Console — these old URLs now 301 to correct destinations
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const redirect = LEGACY_REDIRECTS[path];
    if (redirect) {
      return res.redirect(301, redirect);
    }
    // Catch-all for /stream/* and /category/*
    if (path.startsWith("/stream/") || path.startsWith("/category/")) {
      return res.redirect(301, "/library");
    }
    // Catch-all for /video/* — old Famous AI video URL pattern (e.g. /video/cv3, /video/cv4)
    if (path.startsWith("/video/")) {
      return res.redirect(301, "/library");
    }
    // /downloads is a common soft-404 path from old app download links
    if (path === "/downloads") {
      return res.redirect(301, "/");
    }
    // Clean up template URL placeholders that Google may crawl from SearchAction schema markup
    // Handles both old {search_term_string} and new {search_term} template variables
    if (path === "/library" && (
      req.query.search === "{search_term_string}" ||
      req.query.search === "{search_term}" ||
      (typeof req.query.search === "string" && req.query.search.startsWith("{") && req.query.search.endsWith("}"))
    )) {
      return res.redirect(301, "https://ztvlivestream.com/library");
    }
    // Redirect www search URLs to canonical non-www (prevents duplicate content)
    if (
      process.env.NODE_ENV === "production" &&
      path === "/library" &&
      typeof req.query.search === "string" &&
      req.query.search.length > 0
    ) {
      // Let the noindex header handle these — don't redirect (would break the search feature)
      // noindex is set in middleware 3a above
    }
    next();
  });

  // ── 3a. noIndex for private pages via X-Robots-Tag header
  // Using HTTP header instead of HTML body injection because Vite dev server
  // bypasses res.send() interceptors. X-Robots-Tag is fully supported by Google.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    if (
      !path.startsWith("/api/") &&
      !path.startsWith("/manus-storage/") &&
      !path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|xml|txt)$/)
    ) {
      // Block private pages
      if (NO_INDEX_PATHS.has(path)) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      }
      // Block library search/filter query pages — thin/duplicate content
      // These are blocked in robots.txt too, but X-Robots-Tag is a belt-and-suspenders fix
      if (path === "/library" && (
        req.query.search ||
        req.query.category ||
        req.query.brand
      )) {
        res.setHeader("X-Robots-Tag", "noindex, follow");
      }
    }
    next();
  });

  // ── 3b. Server-side meta injection for Googlebot and social crawlers
  // React SPA renders client-side, so crawlers see empty HTML by default.
  // We intercept HTML responses and inject correct meta tags server-side.
  // This fixes "Crawled - currently not indexed" — Google now sees real content.
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers["user-agent"] || "";
    const isCrawler =
      /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot/i.test(ua);

    if (!isCrawler) return next();

    // Only intercept HTML page requests (not API, assets, etc.)
    const path = req.path;
    if (
      path.startsWith("/api/") ||
      path.startsWith("/manus-storage/") ||
      path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|xml|txt)$/)
    ) {
      return next();
    }

    // For /watch/:id pages, fetch real video data for Googlebot (rich SEO meta per video)
    const watchMatch = path.match(/^\/watch\/(\d+)$/);
    if (watchMatch) {
      const videoId = parseInt(watchMatch[1], 10);
      try {
        const drizzle = await getDb();
        const rows = drizzle ? await drizzle.select().from(videos).where(eq(videos.id, videoId)).limit(1) : [];
        const v = rows[0];
        if (!v) {
          // Video doesn't exist — return real 404 to prevent soft 404 in Search Console
          res.setHeader("X-Robots-Tag", "noindex, nofollow");
          return res.status(404).send(
            `<!DOCTYPE html><html lang="en"><head><title>Video Not Found | ZTVLIVE</title><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://ztvlivestream.com/library" /></head><body><h1>404 - Video Not Found</h1><p>This video may have been removed or doesn't exist.</p><a href="/library">Browse Library</a></body></html>`
          );
        }
        if (v) {
          const thumbUrl = v.youtubeId && v.youtubeId.length > 5
            ? `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`
            : `${BASE_URL}/og-image.png`;
          // Build a rich description — avoid thin content (< 100 chars) which causes "Crawled - not indexed"
          const rawDesc = v.description || "";
          const richDescription = rawDesc.length >= 100
            ? rawDesc.slice(0, 300)
            : `Watch "${v.title}" free on ZTVLIVE — your 24/7 streaming platform for live TV, entertainment, sports, gaming, music, and culture. No subscription required. Stream free on any device.`;
          // Build ISO 8601 duration from stored duration string (e.g. "12:34" → "PT12M34S")
          const toISO8601Dur = (dur: string | null | undefined): string | undefined => {
            if (!dur) return undefined;
            const parts = dur.split(":").map(Number);
            if (parts.length === 2) {
              const [m, s] = parts;
              return `PT${m}M${s}S`;
            } else if (parts.length === 3) {
              const [h, m, s] = parts;
              return `PT${h}H${m}M${s}S`;
            }
            return undefined;
          };
          const isoDuration = toISO8601Dur(v.duration);
          const videoObjectSchema = {
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: v.title,
            description: richDescription,
            thumbnailUrl: thumbUrl,
            uploadDate: v.publishedAt ? new Date(v.publishedAt).toISOString() : new Date().toISOString(),
            ...(isoDuration ? { duration: isoDuration } : {}),
            embedUrl: `https://www.youtube.com/embed/${v.youtubeId}`,
            contentUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
            author: {
              "@type": "Person",
              name: v.creatorName ?? "ZTVLIVE",
            },
            publisher: {
              "@type": "Organization",
              name: "ZTVLIVE",
              logo: { "@type": "ImageObject", url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-square-VXyb5yTmXea3FzJGnrNLRJ.png" },
            },
          };
          const videoMeta = {
            title: `${v.title} — Watch Free on ZTVLIVE`,
            description: richDescription,
            canonical: `${BASE_URL}${path}`,
            image: thumbUrl,
            videoSchema: videoObjectSchema,
          };
          const originalSend2 = res.send.bind(res);
          res.send = function (body: unknown) {
            if (typeof body === "string" && body.includes("<html")) {
              return originalSend2(injectMetaTags(body, path, videoMeta));
            }
            return originalSend2(body);
          };
          return next();
        }
      } catch { /* fall through to generic */ }
    }

    // For all other pages, inject static meta tags
    const originalSend = res.send.bind(res);
    res.send = function (body: unknown) {
      if (typeof body === "string" && body.includes("<html")) {
        return originalSend(injectMetaTags(body, path));
      }
      return originalSend(body);
    };

    next();
  });

  // ── 4. Sitemap Index — points to sub-sitemaps for pages and videos
  // Google recommends splitting large sitemaps (>500 URLs) into a sitemap index
  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    const now = new Date().toISOString().split("T")[0];
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-videos.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapIndex);
  });

  // ── 5. Pages sitemap — static pages only
  app.get("/sitemap-pages.xml", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buildSitemap(STATIC_URLS));
  });

  // ── 6. Videos sitemap — dynamic video pages
  app.get("/sitemap-videos.xml", async (_req: Request, res: Response) => {
    try {
      const drizzle = await getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const videoList = await drizzle.select().from(videos).orderBy(desc(videos.publishedAt)).limit(1000);
      const videoUrls = videoList.map((v: typeof videos.$inferSelect) => {
        // Google requires stable, publicly accessible thumbnail URLs (no redirects, no signed URLs)
        // For YouTube videos: use YouTube's direct maxresdefault thumbnail (always public, no signing)
        // For custom uploads: /manus-storage/ returns a 307 redirect to signed CloudFront URLs
        //   which Google cannot follow — use a stable branded fallback instead
        let thumbnailUrl: string;
        if (v.youtubeId && v.youtubeId.length > 5) {
          thumbnailUrl = `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`;
        } else if (v.thumbnailUrl && v.thumbnailUrl.startsWith("https://") && !v.thumbnailUrl.includes("/manus-storage/")) {
          // External absolute URL (Cloudinary, direct CDN, etc.) — use as-is
          thumbnailUrl = v.thumbnailUrl;
        } else {
          // Custom upload via manus-storage (signed redirect) — use stable branded fallback
          thumbnailUrl = `${BASE_URL}/og-image.png`;
        }
        return {
          loc: `/watch/${v.id}`,
          lastmod: v.publishedAt ? new Date(v.publishedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          title: v.title,
          description: (v.description && v.description.length >= 100) ? v.description.slice(0, 300) : `Watch "${v.title}" free on ZTVLIVE — your 24/7 streaming platform for live TV, entertainment, sports, gaming, music, and culture. No subscription required.`,
          thumbnailUrl,
        };
      });

      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(buildSitemap([], videoUrls));
    } catch {
      // Fallback to empty video sitemap
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(buildSitemap([]));
    }
  });
}
