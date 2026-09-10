import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { referralAttributions, referralPartners, referralRewardReviews } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  generateOpaqueReferralToken,
  getAttributionDecision,
  getReferralProgramMode,
  hashEmailAddress,
  hashOpaqueReferralToken,
  isReferralProgramWritable,
  referralLinkPath,
} from "../referralPolicy";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
}

function requireStagingWrite() {
  if (!isReferralProgramWritable()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The referral program is locked. No enrollment, attribution, or reward action is enabled.",
    });
  }
}

const emptyAdminSummary = () => ({
  partners: 0,
  provisional: 0,
  heldAttributions: 0,
  manualReviews: 0,
  mode: getReferralProgramMode(),
});

export const referralRouter = router({
  programStatus: publicProcedure.query(() => ({
    mode: getReferralProgramMode(),
    enrollmentDelivery: "not_sent" as const,
    rewardSettlement: "disabled" as const,
    publicLinks: "inactive" as const,
  })),

  lookupEnrollment: publicProcedure
    .input(z.object({ token: z.string().min(20).max(128) }))
    .query(async ({ input }) => {
      // Never expose partner details, email addresses, or an enrollment form while locked.
      if (!isReferralProgramWritable()) return { state: "locked" as const };
      const db = await getDb();
      if (!db) return { state: "unavailable" as const };
      const tokenHash = hashOpaqueReferralToken(input.token);
      const partner = await db.select({ id: referralPartners.id, status: referralPartners.status, linkStatus: referralPartners.linkStatus })
        .from(referralPartners)
        .where(eq(referralPartners.enrollmentTokenHash, tokenHash))
        .limit(1);
      if (!partner[0] || partner[0].status !== "provisional" || partner[0].linkStatus !== "inactive") {
        return { state: "unavailable" as const };
      }
      return { state: "provisional" as const };
    }),

  captureAttribution: publicProcedure
    .input(z.object({ token: z.string().min(20).max(128), referredEmail: z.string().email() }))
    .mutation(async ({ input }) => {
      // This endpoint intentionally makes no database write until a separately approved staging demo.
      if (!isReferralProgramWritable()) return { ...getAttributionDecision({
        programMode: "staging_locked",
        linkStatus: "inactive",
        partnerEmail: "locked@ztvlive.invalid",
        referredEmail: input.referredEmail,
        duplicateContact: false,
        rightsVerified: false,
      }), persisted: false };

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Staging database unavailable" });
      const tokenHash = hashOpaqueReferralToken(input.token);
      const partner = await db.select().from(referralPartners).where(eq(referralPartners.linkTokenHash, tokenHash)).limit(1);
      if (!partner[0]) return { status: "held" as const, reason: "inactive_link" as const, persisted: false };
      const emailHash = hashEmailAddress(input.referredEmail);
      const existing = await db.select({ id: referralAttributions.id }).from(referralAttributions)
        .where(eq(referralAttributions.referredEmailHash, emailHash))
        .limit(1);
      const decision = getAttributionDecision({
        programMode: getReferralProgramMode(),
        linkStatus: partner[0].linkStatus,
        partnerEmail: partner[0].email,
        referredEmail: input.referredEmail,
        duplicateContact: existing.length > 0,
        rightsVerified: false,
      });
      await db.insert(referralAttributions).values({
        partnerId: partner[0].id,
        referredEmailHash: emailHash,
        referralTokenHash: tokenHash,
        status: decision.status,
        holdReason: decision.reason,
      });
      return { ...decision, persisted: true };
    }),

  adminSummary: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return emptyAdminSummary();
    try {
      const [[partners], [provisional], [heldAttributions], [manualReviews]] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(referralPartners),
        db.select({ count: sql<number>`count(*)` }).from(referralPartners).where(eq(referralPartners.status, "provisional")),
        db.select({ count: sql<number>`count(*)` }).from(referralAttributions).where(eq(referralAttributions.status, "held")),
        db.select({ count: sql<number>`count(*)` }).from(referralRewardReviews).where(eq(referralRewardReviews.status, "eligible_for_manual_review")),
      ]);
      return {
        partners: Number(partners?.count ?? 0),
        provisional: Number(provisional?.count ?? 0),
        heldAttributions: Number(heldAttributions?.count ?? 0),
        manualReviews: Number(manualReviews?.count ?? 0),
        mode: getReferralProgramMode(),
      };
    } catch (error) {
      console.warn("[Referral] Summary unavailable until the reviewed staging migration is applied", error);
      return emptyAdminSummary();
    }
  }),

  listPartners: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.select({
        id: referralPartners.id,
        name: referralPartners.name,
        organization: referralPartners.organization,
        status: referralPartners.status,
        verificationStatus: referralPartners.verificationStatus,
        linkStatus: referralPartners.linkStatus,
        createdAt: referralPartners.createdAt,
      }).from(referralPartners).orderBy(desc(referralPartners.createdAt)).limit(50);
    } catch (error) {
      console.warn("[Referral] Partner queue unavailable until the reviewed staging migration is applied", error);
      return [];
    }
  }),

  listRewardReviews: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.select({
        id: referralRewardReviews.id,
        attributionId: referralRewardReviews.attributionId,
        status: referralRewardReviews.status,
        reviewerNotes: referralRewardReviews.reviewerNotes,
        createdAt: referralRewardReviews.createdAt,
        reviewedAt: referralRewardReviews.reviewedAt,
      }).from(referralRewardReviews).orderBy(desc(referralRewardReviews.createdAt)).limit(50);
    } catch (error) {
      console.warn("[Referral] Reward queue unavailable until the reviewed staging migration is applied", error);
      return [];
    }
  }),

  createProvisionalInvite: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(128), email: z.string().email(), organization: z.string().max(160).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      requireStagingWrite();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Staging database unavailable" });
      const enrollmentToken = generateOpaqueReferralToken();
      const linkToken = generateOpaqueReferralToken();
      const partnerCode = `ZTV-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      await db.insert(referralPartners).values({
        name: input.name,
        email: input.email.trim().toLowerCase(),
        organization: input.organization?.trim() || null,
        partnerCode,
        enrollmentTokenHash: hashOpaqueReferralToken(enrollmentToken),
        linkTokenHash: hashOpaqueReferralToken(linkToken),
        status: "provisional",
        verificationStatus: "pending_review",
        linkStatus: "inactive",
      });
      return {
        partnerCode,
        enrollmentUrl: referralLinkPath(enrollmentToken),
        referralUrl: referralLinkPath(linkToken),
        delivery: "not_sent" as const,
        linkStatus: "inactive" as const,
      };
    }),

  qualifyAttribution: protectedProcedure
    .input(z.object({ attributionId: z.number(), rightsVerified: z.literal(true), notes: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      requireStagingWrite();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Staging database unavailable" });

      // This is a manual legal/rights gate. It creates a review record only; it
      // does not calculate, promise, or settle any reward.
      await db.update(referralAttributions).set({
        status: "eligible_for_manual_review",
        holdReason: "eligible_for_manual_review",
      }).where(eq(referralAttributions.id, input.attributionId));

      const existing = await db.select({ id: referralRewardReviews.id })
        .from(referralRewardReviews)
        .where(eq(referralRewardReviews.attributionId, input.attributionId))
        .limit(1);
      if (existing[0]) return { reviewId: existing[0].id, status: "eligible_for_manual_review" as const, settlement: "disabled" as const };

      const inserted = await db.insert(referralRewardReviews).values({
        attributionId: input.attributionId,
        status: "eligible_for_manual_review",
        reviewerNotes: input.notes?.trim() || null,
      });
      return { reviewId: Number(inserted[0].insertId), status: "eligible_for_manual_review" as const, settlement: "disabled" as const };
    }),

  reviewReward: protectedProcedure
    .input(z.object({ reviewId: z.number(), decision: z.enum(["approved_non_payment", "rejected"]), notes: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      requireStagingWrite();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Staging database unavailable" });
      await db.update(referralRewardReviews).set({ status: input.decision, reviewerNotes: input.notes?.trim() || null, reviewedByUserId: ctx.user.id, reviewedAt: new Date() })
        .where(eq(referralRewardReviews.id, input.reviewId));
      return { success: true, settlement: "disabled" as const };
    }),
});
