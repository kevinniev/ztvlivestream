/**
 * Auth Session Persistence Tests
 *
 * Verifies that the Google OAuth session persistence fixes are correct:
 * 1. trust proxy is set on the Express app
 * 2. session cookie is configured with correct settings for production
 * 3. context.ts checks all three auth paths (passport, session.userId, Manus JWT)
 * 4. OAuth callback sets session.userId as backup
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Test 1: trust proxy setting ───────────────────────────────────────────────
describe("Express trust proxy", () => {
  it("should be set to 1 in the server config", async () => {
    // Read the server index.ts and verify trust proxy is set
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.resolve(__dirname, "_core/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toContain("app.set('trust proxy', 1)");
  });
});

// ── Test 2: Session cookie configuration ─────────────────────────────────────
describe("Session cookie configuration", () => {
  it("should use secure:true and sameSite:none in production", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.resolve(__dirname, "_core/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    // Verify secure flag is set for production
    expect(content).toContain('secure: process.env.NODE_ENV === "production"');
    // Verify sameSite is 'none' for production (cross-origin support)
    expect(content).toContain('"none"');
  });

  it("should have a 30-day maxAge", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.resolve(__dirname, "_core/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toContain("30 * 24 * 60 * 60 * 1000");
  });
});

// ── Test 3: context.ts checks all three auth paths ───────────────────────────
describe("createContext auth paths", () => {
  it("should check passport req.user first", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const contextPath = path.resolve(__dirname, "_core/context.ts");
    const content = fs.readFileSync(contextPath, "utf-8");
    // Passport check should come before session.userId check
    const passportIdx = content.indexOf("req.user");
    const sessionIdx = content.indexOf("session?.userId");
    expect(passportIdx).toBeGreaterThan(-1);
    expect(sessionIdx).toBeGreaterThan(-1);
    expect(passportIdx).toBeLessThan(sessionIdx);
  });

  it("should fall back to Manus JWT authentication", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const contextPath = path.resolve(__dirname, "_core/context.ts");
    const content = fs.readFileSync(contextPath, "utf-8");
    expect(content).toContain("sdk.authenticateRequest");
  });
});

// ── Test 4: OAuth callback sets session.userId ────────────────────────────────
describe("OAuth callback session.userId", () => {
  it("should set session.userId in Google OAuth callback", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const oauthPath = path.resolve(__dirname, "auth/oauthRoutes.ts");
    const content = fs.readFileSync(oauthPath, "utf-8");
    expect(content).toContain("(req.session as any).userId = (req as any).user.id");
  });

  it("should call req.session.save() before redirect in Google callback", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const oauthPath = path.resolve(__dirname, "auth/oauthRoutes.ts");
    const content = fs.readFileSync(oauthPath, "utf-8");
    expect(content).toContain("req.session.save");
  });

  it("should set session.userId in Facebook OAuth callback", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const oauthPath = path.resolve(__dirname, "auth/oauthRoutes.ts");
    const content = fs.readFileSync(oauthPath, "utf-8");
    // Count occurrences — should appear in both Google and Facebook callbacks
    const matches = content.match(/\(req\.session as any\)\.userId = \(req as any\)\.user\.id/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Test 5: AuthRedirectHandler in App.tsx ────────────────────────────────────
describe("AuthRedirectHandler", () => {
  it("should be present in App.tsx", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const appPath = path.resolve(__dirname, "../client/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain("AuthRedirectHandler");
    expect(content).toContain('params.get("auth") === "1"');
    expect(content).toContain("utils.auth.me.invalidate");
  });
});
