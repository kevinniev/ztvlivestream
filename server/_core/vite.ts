import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// Paths that should return a real HTTP 404 (not a soft-404 SPA shell)
// These are invalid/garbage URLs that Google marks as Soft 404 when they return 200
const HARD_404_PATHS_STATIC = new Set([
  "/undefined",
  "/null",
  "/watch/undefined",
  "/watch/null",
  "/watch/NaN",
  "/watch/0",
]);

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // SPA fallback — read index.html and send via res.send() (NOT res.sendFile)
  // CRITICAL: res.sendFile() bypasses res.send() interceptors used by the crawler
  // meta-injection middleware. Using res.send() ensures Googlebot gets correct
  // per-page titles, descriptions, and JSON-LD schema.
  const indexHtmlPath = path.resolve(distPath, "index.html");
  app.use("*", (req, res) => {
    const reqPath = req.path;
    if (HARD_404_PATHS_STATIC.has(reqPath)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).send(`<!DOCTYPE html><html><head><title>404 Not Found</title><meta name="robots" content="noindex,nofollow"></head><body><h1>404 Not Found</h1><p>The requested URL was not found.</p></body></html>`);
    }
    try {
      const html = fs.readFileSync(indexHtmlPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=UTF-8");
      res.send(html);
    } catch {
      res.status(500).send("Internal Server Error");
    }
  });
}
