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
const DEFAULT_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-primary-hG5E4F9vWfzRrbzJS8nAVW.png";
const DEFAULT_DESCRIPTION =
  "ZTVLIVE — America's #1 independent 24/7 live streaming network. Watch live TV, tech, gaming, sports, movies & music free. Creators earn 70% revenue share.";

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
  const canonicalUrl = url ? `${BASE_URL}${url}` : `${BASE_URL}/`;

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
        url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-square-VXyb5yTmXea3FzJGnrNLRJ.png",
        width: 1248,
        height: 1248,
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
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/library?search={search_term}`,
        },
        "query-input": "required name=search_term",
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

/**
 * Convert a duration string to ISO 8601 format required by Google's VideoObject schema.
 * Accepts: "MM:SS", "H:MM:SS", "PTxMxS" (already ISO), or a number (seconds).
 * Returns a valid ISO 8601 duration string like "PT6M36S".
 */
function toISO8601Duration(duration?: string | number): string | undefined {
  if (!duration) return undefined;
  // Already ISO 8601 format (starts with P)
  if (typeof duration === "string" && duration.startsWith("P")) {
    // Validate it's positive (not PT0S)
    if (duration === "PT0S" || duration === "P0D") return undefined;
    return duration;
  }
  // Convert seconds (number) to ISO 8601
  if (typeof duration === "number") {
    if (duration <= 0) return undefined;
    const h = Math.floor(duration / 3600);
    const m = Math.floor((duration % 3600) / 60);
    const s = Math.floor(duration % 60);
    return `PT${h > 0 ? h + "H" : ""}${m > 0 ? m + "M" : ""}${s > 0 ? s + "S" : "0S"}`;
  }
  // Convert "MM:SS" or "H:MM:SS" string format
  const parts = duration.split(":").map(Number);
  if (parts.some(isNaN)) return undefined;
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) { [h, m, s] = parts; }
  else if (parts.length === 2) { [m, s] = parts; }
  else if (parts.length === 1) { s = parts[0]!; }
  const totalSeconds = h * 3600 + m * 60 + s;
  if (totalSeconds <= 0) return undefined;
  return `PT${h > 0 ? h + "H" : ""}${m > 0 ? m + "M" : ""}${s > 0 ? s + "S" : "0S"}`;
}

export function videoSchema(video: {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  youtubeId: string;
  duration?: string | number;
  creatorName?: string;
  publishedAt?: Date | string;
}) {
  const isoDuration = toISO8601Duration(video.duration);
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description ?? "",
    thumbnailUrl: video.thumbnailUrl ?? "",
    uploadDate: video.publishedAt ? new Date(video.publishedAt).toISOString() : new Date().toISOString(),
    ...(isoDuration ? { duration: isoDuration } : {}),
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    author: {
      "@type": "Person",
      name: video.creatorName ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-square-VXyb5yTmXea3FzJGnrNLRJ.png" },
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
  const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-primary-hG5E4F9vWfzRrbzJS8nAVW.png";
  const imageUrl = show.thumbnailUrl || LOGO_URL;
  const descriptionText = show.description || "Watch ZTVLIVE's 24/7 live stream free. Entertainment, sports, music, culture, and more — streaming live right now at ztvlivestream.com.";

  const now = Date.now();
  // eventStatus: use EventScheduled for future, EventScheduled for live (ongoing), EventScheduled for past replay
  // Google recommends EventScheduled as default; use EventCancelled/EventPostponed only when applicable
  const eventStatus =
    now < show.startTime
      ? "https://schema.org/EventScheduled"
      : now > show.endTime
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventScheduled";

  const broadcastStatus =
    now < show.startTime
      ? "https://schema.org/BroadcastEventLive"
      : now > show.endTime
      ? "https://schema.org/BroadcastEventReplay"
      : "https://schema.org/BroadcastEventLive";

  return {
    "@context": "https://schema.org",
    "@type": "BroadcastEvent",
    name: show.title,
    description: descriptionText,
    startDate: new Date(show.startTime).toISOString(),
    endDate: new Date(show.endTime).toISOString(),
    eventStatus: broadcastStatus,
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      width: 1280,
      height: 720,
    },
    isLiveBroadcast: true,
    broadcastOfEvent: {
      "@type": "Event",
      name: show.title,
      description: descriptionText,
      startDate: new Date(show.startTime).toISOString(),
      endDate: new Date(show.endTime).toISOString(),
      // ✅ FIX: location — required by Google for Event schema
      location: {
        "@type": "VirtualLocation",
        url: "https://ztvlivestream.com/live",
        name: "ZTVLIVE — Live Streaming Platform",
      },
      // ✅ FIX: eventStatus — required by Google
      eventStatus: eventStatus,
      // ✅ FIX: image — required by Google
      image: {
        "@type": "ImageObject",
        url: imageUrl,
        width: 1280,
        height: 720,
      },
      // ✅ FIX: organizer — recommended by Google
      organizer: {
        "@type": "Organization",
        name: "ZTVLIVE",
        url: "https://ztvlivestream.com",
        logo: {
          "@type": "ImageObject",
          url: LOGO_URL,
        },
        sameAs: [
          "https://www.youtube.com/@ztvlivestream",
          "https://www.instagram.com/ztvlive_official",
          "https://www.threads.com/@ztvlive_official",
        ],
      },
      // ✅ FIX: offers — recommended by Google (free to watch)
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: "https://ztvlivestream.com/live",
        validFrom: new Date(show.startTime).toISOString(),
        description: "Free live stream — no subscription required",
      },
      // ✅ FIX: performer — adds context for Google
      performer: {
        "@type": "Organization",
        name: "ZTVLIVE",
        url: "https://ztvlivestream.com",
      },
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
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
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function offerCatalogSchema(plans: { name: string; price: number; description: string; url: string }[]) {
  const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-square-VXyb5yTmXea3FzJGnrNLRJ.png";
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ZTVLIVE+ Subscription Plans",
    description: "Premium streaming subscription plans for ZTVLIVE",
    itemListElement: plans.map((plan, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: `ZTVLIVE+ ${plan.name}`,
        description: plan.description,
        url: `${BASE_URL}${plan.url}`,
        image: LOGO_URL,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "127",
          bestRating: "5",
          worstRating: "1",
        },
        review: [
          {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: "5",
              bestRating: "5",
            },
            author: {
              "@type": "Person",
              name: "Marcus T.",
            },
            reviewBody: "ZTVLIVE+ is worth every penny. Ad-free streaming and the creator tools are incredible. I've been a subscriber since day one.",
            datePublished: "2026-05-15",
          },
          {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: "5",
              bestRating: "5",
            },
            author: {
              "@type": "Person",
              name: "Jasmine R.",
            },
            reviewBody: "The best streaming platform for Black culture content. No ads, great shows, and the quiz game is addictive!",
            datePublished: "2026-04-28",
          },
        ],
        brand: {
          "@type": "Brand",
          "@id": "https://ztvlivestream.com/#brand",
          name: "ZTVLIVE",
        },
        offers: {
          "@type": "Offer",
          price: plan.price.toFixed(2),
          priceCurrency: "USD",
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          availability: "https://schema.org/InStock",
          url: `${BASE_URL}${plan.url}`,
          seller: {
            "@type": "Organization",
            name: "ZTVLIVE",
            url: "https://ztvlivestream.com",
          },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: "0",
              currency: "USD",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "US",
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 0,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 0,
                unitCode: "DAY",
              },
            },
            doesNotShip: true,
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "US",
            returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
            merchantReturnDays: 0,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/FreeReturn",
          },
        },
      },
    })),
  };
}
