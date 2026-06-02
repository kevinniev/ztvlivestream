/**
 * useCanonical — dynamically sets the canonical <link> tag for each page.
 * Fixes "Duplicate, Google chose different canonical than user" in Google Search Console.
 *
 * Usage:
 *   useCanonical("/library")
 *   useCanonical(`/watch/${videoId}`)
 *   useCanonical() // uses current path automatically
 */

import { useEffect } from "react";
import { useLocation } from "wouter";

const BASE_URL = "https://ztvlivestream.com";

export function useCanonical(path?: string) {
  const [location] = useLocation();

  useEffect(() => {
    const canonicalPath = path ?? location;
    // Remove trailing slash except for root
    const normalizedPath = canonicalPath !== "/" ? canonicalPath.replace(/\/$/, "") : "/";
    const canonicalUrl = `${BASE_URL}${normalizedPath}`;

    // Find or create the canonical link tag
    let link = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    // Also update og:url
    let ogUrl = document.querySelector<HTMLMetaElement>("meta[property='og:url']");
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = canonicalUrl;

    return () => {
      // Reset to homepage canonical on unmount
      if (link) link.href = BASE_URL;
      if (ogUrl) ogUrl.content = BASE_URL;
    };
  }, [path, location]);
}

/**
 * usePageMeta — sets title, description, canonical, and og tags for a page.
 */
export function usePageMeta({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
}) {
  const [location] = useLocation();

  useEffect(() => {
    const canonicalPath = path ?? location;
    const normalizedPath = canonicalPath !== "/" ? canonicalPath.replace(/\/$/, "") : "/";
    const canonicalUrl = `${BASE_URL}${normalizedPath}`;
    const fullTitle = title.includes("ZTVLIVE") ? title : `${title} | ZTVLIVE`;

    // Title
    document.title = fullTitle;

    // Canonical
    let link = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    // Description
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>("meta[name='description']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    // OG tags
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property='${property}']`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("og:title", fullTitle);
    setMeta("og:url", canonicalUrl);
    if (description) setMeta("og:description", description);
    if (image) setMeta("og:image", image);

    return () => {
      document.title = "ZTVLIVE — Premium 24/7 Live Streaming Platform";
      if (link) link.href = BASE_URL;
    };
  }, [title, description, path, image, location]);
}
