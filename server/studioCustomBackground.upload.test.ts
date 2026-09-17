import { describe, expect, it } from "vitest";
import {
  canManageStudioCustomBackground,
  makeStudioBackgroundStorageKey,
  parseStudioBackgroundDataUrl,
} from "./studioCustomBackground";

describe("Studio custom background server guard", () => {
  it("permits an administrator even without a paid tier", () => {
    expect(canManageStudioCustomBackground({ role: "admin", subscriptionTier: "free", subscriptionStatus: "inactive" })).toBe(true);
  });

  it("permits active paid members and refuses inactive or free accounts", () => {
    expect(canManageStudioCustomBackground({ role: "user", subscriptionTier: "premium", subscriptionStatus: "active" })).toBe(true);
    expect(canManageStudioCustomBackground({ role: "creator", subscriptionTier: "free", subscriptionStatus: "inactive" })).toBe(false);
    expect(canManageStudioCustomBackground({ role: "user", subscriptionTier: "basic", subscriptionStatus: "past_due" })).toBe(false);
  });

  it("parses only bounded supported image data URLs", () => {
    const result = parseStudioBackgroundDataUrl("data:image/png;base64,aGVsbG8=");
    expect(result.mimeType).toBe("image/png");
    expect(result.buffer.toString()).toBe("hello");
    expect(() => parseStudioBackgroundDataUrl("data:image/gif;base64,aGVsbG8=")).toThrow("JPEG, PNG, or WebP");
  });

  it("creates a scoped, sanitized storage path", () => {
    expect(makeStudioBackgroundStorageKey(42, "My Neon Set (final).png", "image/png")).toBe("studio-backgrounds/42/My-Neon-Set-final.png");
  });
});
