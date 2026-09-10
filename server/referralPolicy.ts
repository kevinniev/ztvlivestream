import crypto from "crypto";

export const REFERRAL_PROGRAM_MODE = "REFERRAL_PROGRAM_MODE";
export type ReferralProgramMode = "staging_locked" | "staging_demo";

export type AttributionDecision = {
  status: "held" | "eligible_for_manual_review";
  reason:
    | "program_locked"
    | "inactive_link"
    | "self_referral_hold"
    | "rights_review_required"
    | "duplicate_contact_hold"
    | "eligible_for_manual_review";
};

/**
 * The candidate is fail-closed. Production, unset, malformed, and private
 * staging environments all resolve to a locked program until a future, separate
 * managed-staging authorization explicitly enables the demo mode.
 */
export function getReferralProgramMode(value = process.env[REFERRAL_PROGRAM_MODE]): ReferralProgramMode {
  return value === "staging_demo" ? "staging_demo" : "staging_locked";
}

export function isReferralProgramWritable(value = process.env[REFERRAL_PROGRAM_MODE]) {
  return getReferralProgramMode(value) === "staging_demo";
}

export function generateOpaqueReferralToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashEmailAddress(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function hashOpaqueReferralToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getAttributionDecision(input: {
  programMode: ReferralProgramMode;
  linkStatus: "inactive" | "active" | "revoked";
  partnerEmail: string;
  referredEmail: string;
  duplicateContact: boolean;
  rightsVerified: boolean;
}): AttributionDecision {
  if (input.programMode !== "staging_demo") return { status: "held", reason: "program_locked" };
  if (input.linkStatus !== "active") return { status: "held", reason: "inactive_link" };
  if (hashEmailAddress(input.partnerEmail) === hashEmailAddress(input.referredEmail)) {
    return { status: "held", reason: "self_referral_hold" };
  }
  if (input.duplicateContact) return { status: "held", reason: "duplicate_contact_hold" };
  if (!input.rightsVerified) return { status: "held", reason: "rights_review_required" };
  return { status: "eligible_for_manual_review", reason: "eligible_for_manual_review" };
}

export function referralLinkPath(token: string) {
  return `/partner/${encodeURIComponent(token)}`;
}
