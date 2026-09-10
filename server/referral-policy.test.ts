import { describe, expect, it } from "vitest";
import {
  generateOpaqueReferralToken,
  getAttributionDecision,
  getReferralProgramMode,
  hashEmailAddress,
  hashOpaqueReferralToken,
  referralLinkPath,
} from "./referralPolicy";
import { referralRouter } from "./routers/referralRouter";

describe("referral staging policy", () => {
  it("fails closed unless the explicit staging demo mode is enabled", () => {
    expect(getReferralProgramMode()).toBe("staging_locked");
    expect(getReferralProgramMode("production")).toBe("staging_locked");
    expect(getReferralProgramMode("staging_demo")).toBe("staging_demo");
  });

  it("uses opaque private tokens and deterministic non-reversible hashes", () => {
    const token = generateOpaqueReferralToken();
    expect(token).toHaveLength(43);
    expect(hashEmailAddress("Partner@Example.com")).toBe(hashEmailAddress("partner@example.com"));
    expect(hashOpaqueReferralToken(token)).not.toContain(token);
    expect(hashOpaqueReferralToken("AbC")).not.toBe(hashOpaqueReferralToken("abc"));
    expect(referralLinkPath(token)).toBe(`/partner/${token}`);
  });

  it("holds locked, inactive, self-referred, duplicate, and unverified referrals", () => {
    const base = { linkStatus: "active" as const, partnerEmail: "partner@example.com", referredEmail: "creator@example.com", duplicateContact: false, rightsVerified: true };
    expect(getAttributionDecision({ ...base, programMode: "staging_locked" })).toMatchObject({ status: "held", reason: "program_locked" });
    expect(getAttributionDecision({ ...base, programMode: "staging_demo", linkStatus: "inactive" })).toMatchObject({ reason: "inactive_link" });
    expect(getAttributionDecision({ ...base, programMode: "staging_demo", referredEmail: "partner@example.com" })).toMatchObject({ reason: "self_referral_hold" });
    expect(getAttributionDecision({ ...base, programMode: "staging_demo", duplicateContact: true })).toMatchObject({ reason: "duplicate_contact_hold" });
    expect(getAttributionDecision({ ...base, programMode: "staging_demo", rightsVerified: false })).toMatchObject({ reason: "rights_review_required" });
  });

  it("never treats a referral as reward-ready before manual review", () => {
    const decision = getAttributionDecision({
      programMode: "staging_demo",
      linkStatus: "active",
      partnerEmail: "partner@example.com",
      referredEmail: "creator@example.com",
      duplicateContact: false,
      rightsVerified: true,
    });
    expect(decision).toEqual({ status: "eligible_for_manual_review", reason: "eligible_for_manual_review" });
  });

  it("keeps public capture locked and non-persistent until an approved staging mode is enabled", async () => {
    const caller = referralRouter.createCaller({} as any);
    await expect(caller.programStatus()).resolves.toMatchObject({
      mode: "staging_locked",
      enrollmentDelivery: "not_sent",
      rewardSettlement: "disabled",
      publicLinks: "inactive",
    });
    await expect(caller.captureAttribution({
      token: generateOpaqueReferralToken(),
      referredEmail: "creator@example.com",
    })).resolves.toMatchObject({
      status: "held",
      reason: "program_locked",
      persisted: false,
    });
  });
});
