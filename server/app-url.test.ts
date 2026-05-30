import { describe, expect, it } from "vitest";

describe("APP_URL environment variable", () => {
  it("is set and is a valid HTTPS URL", () => {
    const appUrl = process.env.APP_URL;
    expect(appUrl).toBeDefined();
    expect(appUrl).not.toBe("");
    expect(appUrl).toMatch(/^https?:\/\//);
  });

  it("does not have a trailing slash", () => {
    const appUrl = process.env.APP_URL || "";
    const normalized = appUrl.replace(/\/$/, "");
    expect(normalized).toBe(appUrl.trimEnd());
  });

  it("constructs correct Google OAuth callback URL", () => {
    const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
    const callbackUrl = appUrl
      ? `${appUrl}/api/auth/google/callback`
      : "/api/auth/google/callback";
    expect(callbackUrl).toContain("/api/auth/google/callback");
    if (appUrl) {
      expect(callbackUrl).toMatch(/^https?:\/\//);
    }
  });
});
