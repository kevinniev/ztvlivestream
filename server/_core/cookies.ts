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
    // Google returns to the OAuth callback as a top-level navigation, which
    // works with Lax cookies. Unlike SameSite=None, Lax is accepted on mobile
    // browsers even if an upstream proxy omits x-forwarded-proto.
    sameSite: "lax",
    // Public ZTVLIVE hosts are HTTPS-only. Set Secure independently of proxy
    // headers so Chrome does not reject the callback cookie on mobile.
    secure: !isLocalRequest,
  };
}
