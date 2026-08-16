import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { stripe } from "./client";
import { STRIPE_PRODUCTS, type PlanKey, type BillingInterval } from "./products";

export const stripeRouter = router({
  /**
   * Create a Stripe Checkout session for a ZTVLIVE+ subscription.
   * Returns the checkout URL — frontend opens it in a new tab.
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["basic", "premium", "creatorPro"]),
        interval: z.enum(["monthly", "annual"]),
        origin: z.string().url(),
        returnTo: z.enum(["quiz"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const planConfig = STRIPE_PRODUCTS[input.plan as PlanKey][input.interval as BillingInterval];

      // Get or create Stripe customer
      const userRow = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const user = userRow[0];
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          metadata: { userId: user.id.toString() },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
      }

      // Build line item — if priceId is pre-configured use it, otherwise create inline price
      const lineItem: import("stripe").Stripe.Checkout.SessionCreateParams.LineItem =
        planConfig.priceId
          ? { price: planConfig.priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: "usd",
                product_data: {
                  name: STRIPE_PRODUCTS[input.plan as PlanKey].name,
                  description: STRIPE_PRODUCTS[input.plan as PlanKey].description,
                },
                unit_amount: planConfig.amount,
                recurring: { interval: planConfig.interval },
              },
            };

      const returnQuery = input.returnTo ? `&return_to=${input.returnTo}` : "";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [lineItem],
        success_url: `${input.origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}${returnQuery}`,
        cancel_url: `${input.origin}/subscribe`,
        allow_promotion_codes: true,
        subscription_data: {
          metadata: {
            userId: user.id.toString(),
            plan: input.plan,
            interval: input.interval,
          },
        },
        metadata: {
          userId: user.id.toString(),
          plan: input.plan,
          interval: input.interval,
          customer_email: user.email ?? "",
          customer_name: user.name ?? "",
        },
        client_reference_id: user.id.toString(),
      });

      return { url: session.url };
    }),

  /**
   * Create a Stripe Billing Portal session so users can manage/cancel their subscription.
   */
  createBillingPortal: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const userRow = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const user = userRow[0];
      if (!user?.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${input.origin}/subscribe`,
      });

      return { url: session.url };
    }),

  /**
   * Get the current user's subscription status.
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { tier: "free" as const, status: "inactive", periodEnd: null };

    const userRow = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const user = userRow[0];

    return {
      tier: user?.subscriptionTier ?? "free",
      status: user?.subscriptionStatus ?? "inactive",
      periodEnd: user?.subscriptionCurrentPeriodEnd ?? null,
      hasStripeCustomer: !!user?.stripeCustomerId,
    };
  }),

  /**
   * Verify a completed checkout session and update local subscription state.
   * Called from the /subscribe/success page.
   */
  verifyCheckout: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
        expand: ["subscription"],
      });

      if (session.payment_status !== "paid" && session.status !== "complete") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not completed" });
      }

      const plan = (session.metadata?.plan ?? "basic") as PlanKey;
      const tierMap: Record<PlanKey, "basic" | "premium" | "creator_pro"> = {
        basic: "basic",
        premium: "premium",
        creatorPro: "creator_pro",
      };

      const sub = session.subscription as import("stripe").Stripe.Subscription | null;

      await db
        .update(users)
        .set({
          subscriptionTier: tierMap[plan] ?? "basic",
          stripeSubscriptionId: sub?.id ?? null,
          subscriptionStatus: sub?.status ?? "active",
          subscriptionCurrentPeriodEnd: sub
            ? (sub as any).current_period_end * 1000
            : null,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true, tier: tierMap[plan] };
    }),
});
