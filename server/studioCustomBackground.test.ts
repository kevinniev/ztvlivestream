import { describe, expect, it } from "vitest";
import {
  CUSTOM_BACKGROUND_MAX_BYTES,
  hasActivePaidMembership,
  validateCustomBackground,
} from "../client/src/lib/studioCustomBackground";

describe("Studio custom background validation", () => {
  it("accepts supported image formats within the local staging limit", () => {
    expect(validateCustomBackground({ type: "image/jpeg", size: 1024 })).toEqual({ valid: true });
    expect(validateCustomBackground({ type: "image/png", size: 2048 })).toEqual({ valid: true });
    expect(validateCustomBackground({ type: "image/webp", size: CUSTOM_BACKGROUND_MAX_BYTES })).toEqual({ valid: true });
  });

  it("rejects unsupported, empty, and oversized selections before any upload", () => {
    expect(validateCustomBackground({ type: "image/gif", size: 1024 })).toEqual({ valid: false, message: "Choose a JPEG, PNG, or WebP image." });
    expect(validateCustomBackground({ type: "image/png", size: 0 })).toEqual({ valid: false, message: "That image file is empty." });
    expect(validateCustomBackground({ type: "image/png", size: CUSTOM_BACKGROUND_MAX_BYTES + 1 })).toEqual({ valid: false, message: "Choose an image smaller than 10 MB." });
  });

  it("limits custom backgrounds to active or trialing paid memberships", () => {
    expect(hasActivePaidMembership({ subscriptionTier: "basic", subscriptionStatus: "active" })).toBe(true);
    expect(hasActivePaidMembership({ subscriptionTier: "creator_pro", subscriptionStatus: "trialing" })).toBe(true);
    expect(hasActivePaidMembership({ subscriptionTier: "free", subscriptionStatus: "active" })).toBe(false);
    expect(hasActivePaidMembership({ subscriptionTier: "basic", subscriptionStatus: "past_due" })).toBe(false);
    expect(hasActivePaidMembership(null)).toBe(false);
  });
});
