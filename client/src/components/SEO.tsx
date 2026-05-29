import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "video.other" | "video.tv_show";
  schema?: object | object[];
  noIndex?: boolean;
}

const SITE_NAME = "ZTVLIVE";
const BASE_URL = "https://ztvlivestream.com";
const DEFAULT_IMAGE = "https://ztvlivestream.com/og-image.jpg";
const DEFAULT_DESCRIPTION =
  "ZTVLIVE — Premium 24/7 live streaming platform. Watch live TV, tech, gaming, sports, movies, podcasts, news, and music. Play trivia games and win prizes.";

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  schema,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Premium 24/7 Streaming`;
  const canonicalUrl = url ? `${BASE_URL}${url}` : BASE_URL;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper to set/create meta tag
    const setMeta = (selector: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        const attr = selector.includes("[name=") ? "name" : "property";
        const val = selector.match(/["']([^"']+)["']/)?.[1] ?? "";
        el.setAttribute(attr, val);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Helper to set/create link tag
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // Standard meta
    setMeta('[name="description"]', description);
    setMeta('[name="robots"]', noIndex ? "noindex,nofollow" : "index,follow");

    // Open Graph
    setMeta('[property="og:title"]', fullTitle);
    setMeta('[property="og:description"]', description);
    setMeta('[property="og:image"]', image);
    setMeta('[property="og:url"]', canonicalUrl);
    setMeta('[property="og:type"]', type);
    setMeta('[property="og:site_name"]', SITE_NAME);

    // Twitter Card
    setMeta('[name="twitter:card"]', "summary_large_image");
    setMeta('[name="twitter:site"]', "@ztvlivestream");
    setMeta('[name="twitter:title"]', fullTitle);
    setMeta('[name="twitter:description"]', description);
    setMeta('[name="twitter:image"]', image);

    // Canonical
    setLink("canonical", canonicalUrl);

    // JSON-LD schema
    const schemaId = "ztv-jsonld";
    let schemaEl = document.getElementById(schemaId) as HTMLScriptElement | null;
    if (!schemaEl) {
      schemaEl = document.createElement("script");
      schemaEl.id = schemaId;
      schemaEl.type = "application/ld+json";
      document.head.appendChild(schemaEl);
    }

    const orgSchema = {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
      sameAs: [
        "https://twitter.com/ztvlivestream",
        "https://youtube.com/@ztvlivestream",
        "https://instagram.com/ztvlivestream",
        "https://facebook.com/ztvlivestream",
      ],
    };

    const websiteSchema = {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      name: SITE_NAME,
      url: BASE_URL,
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/library?search={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    };

    const schemas = [
      { "@context": "https://schema.org", ...orgSchema },
      { "@context": "https://schema.org", ...websiteSchema },
      ...(schema ? (Array.isArray(schema) ? schema : [schema]) : []),
    ];

    schemaEl.textContent = JSON.stringify(schemas);

    return () => {
      // Cleanup is handled by next render
    };
  }, [fullTitle, description, image, canonicalUrl, type, noIndex, schema]);

  return null;
}

/* ── Pre-built schema helpers ─────────────────────────── */

export function videoSchema(video: {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  youtubeId: string;
  duration?: string;
  creatorName?: string;
  publishedAt?: Date | string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description ?? "",
    thumbnailUrl: video.thumbnailUrl ?? "",
    uploadDate: video.publishedAt ? new Date(video.publishedAt).toISOString() : new Date().toISOString(),
    duration: video.duration ?? "PT0S",
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    author: {
      "@type": "Person",
      name: video.creatorName ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
    },
  };
}

export function liveBroadcastSchema(show: {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  startTime: number;
  endTime: number;
}) {
  const now = Date.now();
  const status =
    now < show.startTime
      ? "https://schema.org/BroadcastEventLive"
      : now > show.endTime
      ? "https://schema.org/BroadcastEventReplay"
      : "https://schema.org/BroadcastEventLive";

  return {
    "@context": "https://schema.org",
    "@type": "BroadcastEvent",
    name: show.title,
    description: show.description ?? "",
    startDate: new Date(show.startTime).toISOString(),
    endDate: new Date(show.endTime).toISOString(),
    eventStatus: status,
    image: show.thumbnailUrl ?? "",
    isLiveBroadcast: true,
    broadcastOfEvent: {
      "@type": "Event",
      name: show.title,
      startDate: new Date(show.startTime).toISOString(),
      endDate: new Date(show.endTime).toISOString(),
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://ztvlivestream.com${item.url}`,
    })),
  };
}
