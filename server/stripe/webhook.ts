import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { stripe } from "./client";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import type { PlanKey } from "./products";
import { sendSubscriptionConfirmationEmail, sendPaymentFailedEmail } from "../email";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

const tierMap: Record<string, "free" | "basic" | "premium" | "creator_pro"> = {
  basic: "basic",
  premium: "premium",
  creatorPro: "creator_pro",
  creator_pro: "creator_pro",
};

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  let event: import("stripe").Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Test event passthrough — required for Stripe webhook verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Event: ${event.type} | ID: ${event.id}`);

  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database unavailable");
    return res.status(500).json({ error: "Database unavailable" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const userId = session.metadata?.userId
          ? parseInt(session.metadata.userId, 10)
          : session.client_reference_id
          ? parseInt(session.client_reference_id, 10)
          : null;

        if (!userId) break;

        const plan = (session.metadata?.plan ?? "basic") as PlanKey;
        const tier = tierMap[plan] ?? "basic";

        // Retrieve subscription to get period end
        let periodEnd: number | null = null;
        let subId: string | null = null;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          periodEnd = (sub as any).current_period_end * 1000;
          subId = sub.id;
        }

        await db
          .update(users)
          .set({
            subscriptionTier: tier,
            stripeSubscriptionId: subId,
            subscriptionStatus: "active",
            subscriptionCurrentPeriodEnd: periodEnd,
          })
          .where(eq(users.id, userId));

        console.log(`[Stripe Webhook] Subscription activated for user ${userId} → ${tier}`);

        // Send confirmation email to subscriber
        const activatedUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (activatedUser[0]?.email) {
          const tierLabels: Record<string, string> = { basic: "$4.99", premium: "$9.99", creator_pro: "$14.99" };
          sendSubscriptionConfirmationEmail({
            to: activatedUser[0].email,
            name: activatedUser[0].name ?? "",
            tier,
            amount: tierLabels[tier] ?? "$4.99",
          }).catch(() => {});
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const userId = sub.metadata?.userId ? parseInt(sub.metadata.userId, 10) : null;
        if (!userId) break;

        const plan = (sub.metadata?.plan ?? "basic") as PlanKey;
        const tier = tierMap[plan] ?? "basic";
        const isActive = sub.status === "active" || sub.status === "trialing";

        await db
          .update(users)
          .set({
            subscriptionTier: isActive ? tier : "free",
            subscriptionStatus: sub.status,
            subscriptionCurrentPeriodEnd: (sub as any).current_period_end * 1000,
          })
          .where(eq(users.id, userId));

        console.log(`[Stripe Webhook] Subscription updated for user ${userId}: ${sub.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const userId = sub.metadata?.userId ? parseInt(sub.metadata.userId, 10) : null;
        if (!userId) break;

        await db
          .update(users)
          .set({
            subscriptionTier: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
          })
          .where(eq(users.id, userId));

        console.log(`[Stripe Webhook] Subscription canceled for user ${userId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as import("stripe").Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        const userRow = await db
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .limit(1);

        if (userRow[0]) {
          await db
            .update(users)
            .set({ subscriptionStatus: "past_due" })
            .where(eq(users.id, userRow[0].id));
          console.log(`[Stripe Webhook] Payment failed for customer ${customerId}`);
          // Send payment failed email
          if (userRow[0].email) {
            sendPaymentFailedEmail({
              to: userRow[0].email,
              name: userRow[0].name ?? "",
              tier: userRow[0].subscriptionTier ?? "basic",
            }).catch(() => {});
          }
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  return res.json({ received: true });
}
