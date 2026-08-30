import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname?.toLowerCase() ?? "";
  const isLocalRequest = !hostname || LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);

  return {
    httpOnly: true,
    path: "/",
    // Google returns to the OAuth callback as a top-level navigation. Lax works
    // for that return and is accepted by mobile browsers without proxy ambiguity.
    sameSite: "lax",
    // Public ZTVLIVE hosts are HTTPS-only; make callback cookies reliably Secure.
    secure: !isLocalRequest,
  };
}
