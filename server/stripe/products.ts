/**
 * ZTVLIVE+ Stripe Products & Prices
 * Centralised definition — all checkout and webhook handlers import from here.
 */

export const STRIPE_PRODUCTS = {
  basic: {
    name: "ZTVLIVE+ Basic",
    description: "Fewer ads, more enjoyment. Live TV, video library, daily quiz.",
    monthly: {
      priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY ?? "",
      amount: 499, // $4.99 in cents
      interval: "month" as const,
    },
    annual: {
      priceId: process.env.STRIPE_PRICE_BASIC_ANNUAL ?? "",
      amount: 4790, // $47.90/yr (~$3.99/mo, 20% off)
      interval: "year" as const,
    },
  },
  premium: {
    name: "ZTVLIVE+ Premium",
    description: "The full ZTVLIVE+ experience. 100% ad-free, exclusive content, premium quiz.",
    monthly: {
      priceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
      amount: 999, // $9.99
      interval: "month" as const,
    },
    annual: {
      priceId: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? "",
      amount: 9590, // $95.90/yr (~$7.99/mo, 20% off)
      interval: "year" as const,
    },
  },
  creatorPro: {
    name: "ZTVLIVE+ Creator Pro",
    description: "Premium + full creator toolkit. Live streaming, analytics, priority placement.",
    monthly: {
      priceId: process.env.STRIPE_PRICE_CREATOR_MONTHLY ?? "",
      amount: 1499, // $14.99
      interval: "month" as const,
    },
    annual: {
      priceId: process.env.STRIPE_PRICE_CREATOR_ANNUAL ?? "",
      amount: 14390, // $143.90/yr (~$11.99/mo, 20% off)
      interval: "year" as const,
    },
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PRODUCTS;
export type BillingInterval = "monthly" | "annual";

export function getPriceId(plan: PlanKey, interval: BillingInterval): string {
  return STRIPE_PRODUCTS[plan][interval].priceId;
}

export function getPlanAmount(plan: PlanKey, interval: BillingInterval): number {
  return STRIPE_PRODUCTS[plan][interval].amount;
}

export const PLAN_DISPLAY_NAMES: Record<PlanKey, string> = {
  basic: "ZTVLIVE+ Basic",
  premium: "ZTVLIVE+ Premium",
  creatorPro: "ZTVLIVE+ Creator Pro",
};
