import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, breadcrumbSchema, offerCatalogSchema } from "@/components/SEO";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Crown, Check, X, Zap, Shield, Star, ArrowRight, Tv,
  Users, Trophy, Radio, Sparkles, Lock, Loader2, Settings, ExternalLink
} from "lucide-react";

/* ── Success sub-page ─────────────────────────────────────── */
function SubscribeSuccess() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const [verified, setVerified] = useState(false);

  const verify = trpc.stripe.verifyCheckout.useMutation({
    onSuccess: () => { setVerified(true); toast.success("ZTVLIVE+ subscription activated!"); },
    onError: () => toast.error("Could not verify payment. Please contact support."),
  });

  // Auto-verify on mount
  useEffect(() => {
    if (sessionId && user) verify.mutate({ sessionId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user?.id]);

  return (
    <>
      <SEO title="Subscription Activated — ZTVLIVE+" url="/subscribe/success" noIndex />
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[oklch(0.74_0.21_218/0.3)]">
          {verify.isPending ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : <Crown className="w-10 h-10 text-white" />}
        </div>
        <h1 className="text-3xl font-black text-white mb-3">
          {verify.isPending ? "Activating your subscription…" : "Welcome to ZTVLIVE+!"}
        </h1>
        <p className="text-white/55 mb-8">
          {verify.isPending ? "Confirming your payment with Stripe…" : "Your subscription is active. Enjoy ad-free streaming and exclusive content."}
        </p>
        {!verify.isPending && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/")} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] text-white font-bold hover:opacity-90 transition-opacity">
              Start Watching
            </button>
            <button onClick={() => navigate("/subscribe")} className="px-6 py-3 rounded-xl border border-white/15 text-white/70 hover:border-white/30 transition-colors">
              Manage Subscription
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    accent: "oklch(0.55 0.04 264)",
    description: "Start watching for free",
    features: [
      { label: "Live TV streaming",        included: true },
      { label: "Video library access",     included: true },
      { label: "Daily quiz game",          included: true },
      { label: "Program schedule",         included: true },
      { label: "Ad-free experience",       included: false },
      { label: "Exclusive content",        included: false },
      { label: "Premium quiz mode",        included: false },
      { label: "Priority support",         included: false },
      { label: "Creator Pro tools",        included: false },
    ],
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    id: "basic",
    name: "Basic",
    price: "$4.99",
    period: "/month",
    accent: "oklch(0.74 0.21 218)",
    description: "Fewer ads, more enjoyment",
    features: [
      { label: "Live TV streaming",        included: true },
      { label: "Video library access",     included: true },
      { label: "Daily quiz game",          included: true },
      { label: "Program schedule",         included: true },
      { label: "50% fewer ads",            included: true },
      { label: "Exclusive content",        included: false },
      { label: "Premium quiz mode",        included: false },
      { label: "Priority support",         included: false },
      { label: "Creator Pro tools",        included: false },
    ],
    cta: "Get Basic",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$9.99",
    period: "/month",
    accent: "oklch(0.65 0.25 290)",
    description: "The full ZTVLIVE+ experience",
    popular: true,
    features: [
      { label: "Live TV streaming",        included: true },
      { label: "Video library access",     included: true },
      { label: "Daily quiz game",          included: true },
      { label: "Program schedule",         included: true },
      { label: "100% ad-free",             included: true },
      { label: "Exclusive content",        included: true },
      { label: "Premium quiz mode",        included: true },
      { label: "Priority support",         included: true },
      { label: "Creator Pro tools",        included: false },
    ],
    cta: "Get Premium",
  },
  {
    id: "creator-pro",
    name: "Creator Pro",
    price: "$14.99",
    period: "/month",
    accent: "oklch(0.78 0.18 60)",
    description: "Premium + full creator toolkit",
    features: [
      { label: "Live TV streaming",        included: true },
      { label: "Video library access",     included: true },
      { label: "Daily quiz game",          included: true },
      { label: "Program schedule",         included: true },
      { label: "100% ad-free",             included: true },
      { label: "Exclusive content",        included: true },
      { label: "Premium quiz mode",        included: true },
      { label: "Priority support",         included: true },
      { label: "Creator Pro tools + Live", included: true },
    ],
    cta: "Get Creator Pro",
  },
];

const PERKS = [
  { icon: Zap,     title: "Ad-Free Streaming",    desc: "Zero interruptions. No pre-roll, mid-roll, or display ads on any content.",    color: "oklch(0.74 0.21 218)" },
  { icon: Star,    title: "Exclusive Content",     desc: "Premium shows, behind-the-scenes, early releases, and creator-only content.",  color: "oklch(0.65 0.25 290)" },
  { icon: Trophy,  title: "Premium Quiz Mode",     desc: "Compete for real prizes, unlock bonus rounds, and climb the leaderboard.",    color: "oklch(0.78 0.18 60)" },
  { icon: Shield,  title: "Cancel Anytime",        desc: "No contracts. No commitments. Cancel your subscription at any time.",         color: "oklch(0.65 0.22 150)" },
  { icon: Users,   title: "Support Creators",      desc: "70% of your subscription goes directly to the creators you love.",            color: "oklch(0.72 0.2 25)" },
  { icon: Radio,   title: "Multi-Device Access",   desc: "Watch on TV, phone, tablet, or desktop. One subscription, all screens.",      color: "oklch(0.7 0.18 200)" },
];

const TESTIMONIALS = [
  { name: "Marcus T.",   role: "ZTVLIVE+ Premium",    text: "Best streaming decision I made. The quiz game alone is worth it!" },
  { name: "Priya K.",    role: "Creator Pro Member",  text: "The creator tools are incredible. My channel grew 3x in 2 months." },
  { name: "Jordan L.",   role: "ZTVLIVE+ Basic",      text: "Finally a streaming platform that actually pays its creators fairly." },
];

export default function Subscribe() {
  const [location] = useLocation();
  if (location === "/subscribe/success") return <SubscribeSuccess />;

  const { isAuthenticated } = useAuth();
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: subscription } = trpc.stripe.getSubscription.useQuery(undefined, { enabled: isAuthenticated });
  const isSubscribed = subscription?.status === "active" && subscription?.tier !== "free";

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) { window.open(data.url, "_blank"); toast.info("Redirecting to secure Stripe checkout…"); }
      setLoadingPlan(null);
    },
    onError: (err) => { toast.error(err.message ?? "Checkout failed. Please try again."); setLoadingPlan(null); },
  });

  const createBillingPortal = trpc.stripe.createBillingPortal.useMutation({
    onSuccess: (data) => { if (data.url) window.open(data.url, "_blank"); },
    onError: () => toast.error("Could not open billing portal."),
  });

  const planKeyMap: Record<string, "basic" | "premium" | "creatorPro"> = {
    basic: "basic", premium: "premium", "creator-pro": "creatorPro",
  };

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    const plan = planKeyMap[planId];
    if (!plan) return;
    setLoadingPlan(planId);
    createCheckout.mutate({ plan, interval: billingAnnual ? "annual" : "monthly", origin: window.location.origin });
  };

  const handleManageBilling = () => createBillingPortal.mutate({ origin: window.location.origin });

  const schemas = [
    breadcrumbSchema([{ name: "Home", url: "/" }, { name: "ZTVLIVE+ Plans", url: "/subscribe" }]),
    offerCatalogSchema([
      { name: "Basic",       price: 4.99,  description: "Fewer ads, more enjoyment. 50% fewer ads on ZTVLIVE.",                         url: "/subscribe" },
      { name: "Premium",    price: 9.99,  description: "100% ad-free streaming, exclusive content, and premium quiz mode on ZTVLIVE.", url: "/subscribe" },
      { name: "Creator Pro", price: 14.99, description: "Everything in Premium plus full creator toolkit and live streaming access.",    url: "/subscribe" },
    ]),
  ];

  return (
    <>
      <SEO
        title="ZTVLIVE+ — Premium Streaming Plans"
        description="Upgrade to ZTVLIVE+. Choose from Basic ($4.99), Premium ($9.99), or Creator Pro ($14.99). Ad-free streaming, exclusive content, and premium quiz mode."
        url="/subscribe"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* ── HERO ──────────────────────────────────── */}
        <div className="relative overflow-hidden pt-12 pb-16">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]
            bg-gradient-radial from-[oklch(0.74_0.21_218/0.12)] to-transparent pointer-events-none" />
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-[oklch(0.56_0.24_290/0.06)] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-[oklch(0.74_0.21_218/0.06)] rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-[oklch(0.74_0.21_218/0.1)] border border-[oklch(0.74_0.21_218/0.3)]
              text-[oklch(0.74_0.21_218)] text-sm font-bold mb-6">
              <Crown className="w-4 h-4" />
              ZTVLIVE+ Membership
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-white mb-5 leading-tight">
              Unlock the full<br />
              <span className="bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] bg-clip-text text-transparent">
                ZTVLIVE+ experience
              </span>
            </h1>
            <p className="text-lg text-white/55 max-w-xl mx-auto mb-8">
              Ad-free streaming, exclusive content, premium quiz mode, and creator tools.
              <strong className="text-white/80"> Cancel anytime.</strong>
            </p>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-6 flex-wrap mb-8">
              {[
                { label: "Active Members",   value: "12,400+" },
                { label: "Creator Revenue",  value: "70% Share" },
                { label: "Free Trial",       value: "7 Days" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl font-black text-white">{stat.value}</div>
                  <div className="text-xs text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-white/6 border border-white/10 rounded-full p-1">
              <button onClick={() => setBillingAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  !billingAnnual ? "bg-white text-[oklch(0.08_0.012_264)]" : "text-white/50 hover:text-white"
                }`}>
                Monthly
              </button>
              <button onClick={() => setBillingAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
                  billingAnnual ? "bg-white text-[oklch(0.08_0.012_264)]" : "text-white/50 hover:text-white"
                }`}>
                Annual
                <span className="text-[10px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── ACTIVE SUBSCRIPTION BANNER ─────────── */}
        {isSubscribed && (
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl
              bg-gradient-to-r from-[oklch(0.74_0.21_218/0.12)] to-[oklch(0.56_0.24_290/0.08)]
              border border-[oklch(0.74_0.21_218/0.3)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[oklch(0.74_0.21_218/0.2)] flex items-center justify-center">
                  <Crown className="w-5 h-5 text-[oklch(0.74_0.21_218)]" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    You're a ZTVLIVE+ member
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[oklch(0.74_0.21_218/0.2)] text-[oklch(0.74_0.21_218)] font-black capitalize">
                      {(subscription?.tier ?? "basic").replace("_", " ")}
                    </span>
                  </p>
                  {subscription?.periodEnd && (
                    <p className="text-xs text-white/45">
                      Renews {new Date(subscription.periodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleManageBilling}
                className="flex items-center gap-1.5 text-xs font-bold text-[oklch(0.74_0.21_218)] hover:text-white transition-colors whitespace-nowrap"
              >
                <Settings className="w-3.5 h-3.5" />
                Manage
              </button>
            </div>
          </div>
        )}

        {/* ── PLAN CARDS ────────────────────────────── */}
        <div id="compare" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => {
              const isPopular = plan.popular;
              return (
                <div key={plan.id} className={`relative rounded-2xl flex flex-col transition-all duration-200 ${
                  isPopular
                    ? "border-2 border-[oklch(0.65_0.25_290)] bg-gradient-to-b from-[oklch(0.65_0.25_290/0.12)] to-[oklch(0.08_0.012_264)] shadow-2xl shadow-[oklch(0.65_0.25_290/0.35)] scale-105 z-10"
                    : "glass-card hover:border-white/20"
                }`}
                  style={isPopular ? { boxShadow: '0 0 40px oklch(0.65 0.25 290 / 0.3), 0 20px 60px oklch(0.65 0.25 290 / 0.15)' } : {}}>
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[oklch(0.65_0.25_290)] to-[oklch(0.74_0.21_218)] text-white text-xs font-black shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    {/* Plan header */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${plan.accent}18`, border: `1px solid ${plan.accent}30` }}>
                          <Crown className="w-4 h-4" style={{ color: plan.accent }} />
                        </div>
                        <span className="text-sm font-black text-white">{plan.name}</span>
                        {isSubscribed && subscription?.tier === plan.id.replace("-", "_") && (
                          <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-[oklch(0.74_0.21_218/0.15)] border border-[oklch(0.74_0.21_218/0.4)] text-[oklch(0.74_0.21_218)]">
                            ✓ Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-4xl font-black text-white">{plan.price}</span>
                        {plan.period !== "forever" && (
                          <span className="text-sm text-white/40">{plan.period}</span>
                        )}
                      </div>
                      {billingAnnual && plan.id !== "free" && (
                        <div className="text-xs text-green-400 font-semibold">Save 20% billed annually</div>
                      )}
                      <p className="text-xs text-white/45 mt-1">{plan.description}</p>
                    </div>

                    {/* Features */}
                    <div className="flex-1 space-y-2.5 mb-6">
                      {plan.features.map((feature) => (
                        <div key={feature.label} className="flex items-center gap-2.5">
                          {feature.included ? (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: `${plan.accent}20` }}>
                              <Check className="w-2.5 h-2.5" style={{ color: plan.accent }} />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                              <X className="w-2.5 h-2.5 text-white/20" />
                            </div>
                          )}
                          <span className={`text-xs leading-snug ${feature.included ? "text-white/75" : "text-white/25"}`}>
                            {feature.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    {(() => {
                      const isCurrentPlan = isSubscribed && subscription?.tier === plan.id.replace("-", "_");
                      const isLoading = loadingPlan === plan.id;
                      return (
                        <button
                          onClick={() => {
                            if (plan.ctaDisabled) return;
                            if (isCurrentPlan) { handleManageBilling(); return; }
                            handleSubscribe(plan.id);
                          }}
                          disabled={plan.ctaDisabled || isLoading || createBillingPortal.isPending}
                          className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            plan.ctaDisabled
                              ? "bg-white/5 text-white/25 cursor-not-allowed"
                              : isCurrentPlan
                                ? "border border-[oklch(0.74_0.21_218/0.4)] text-[oklch(0.74_0.21_218)] hover:bg-[oklch(0.74_0.21_218/0.08)]"
                                : isPopular
                                  ? "bg-gradient-to-r from-[oklch(0.65_0.25_290)] to-[oklch(0.74_0.21_218)] text-white hover:opacity-90 shadow-lg shadow-[oklch(0.65_0.25_290/0.3)]"
                                  : "border border-white/15 text-white hover:bg-white/8 hover:border-white/30"
                          }`}>
                          {isLoading ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                          ) : plan.ctaDisabled ? (
                            <><Lock className="w-3.5 h-3.5" /> {plan.cta}</>
                          ) : isCurrentPlan ? (
                            <><Settings className="w-3.5 h-3.5" /> Manage Plan <ExternalLink className="w-3 h-3" /></>
                          ) : (
                            <>{plan.cta} <ArrowRight className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-white/30 mt-5">
            7-day free trial on Basic & Premium · No credit card required · Cancel anytime
          </p>
        </div>

        {/* ── PERKS GRID ────────────────────────────── */}
        <div className="bg-gradient-to-b from-transparent via-[oklch(0.74_0.21_218/0.03)] to-transparent py-16">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-white text-center mb-3">
              Why upgrade to <span className="bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] bg-clip-text text-transparent">ZTVLIVE+</span>?
            </h2>
            <p className="text-white/45 text-center mb-10">Everything you need for a premium streaming experience.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PERKS.map((perk) => (
                <div key={perk.title} className="glass-card p-6 hover:border-white/20 transition-all group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${perk.color}15`, border: `1px solid ${perk.color}25` }}>
                    <perk.icon className="w-6 h-6" style={{ color: perk.color }} />
                  </div>
                  <h3 className="text-sm font-black text-white mb-2 group-hover:text-[oklch(0.74_0.21_218)] transition-colors">{perk.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{perk.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TESTIMONIALS ──────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-black text-white text-center mb-8">What members are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-card p-6">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="text-sm font-bold text-white">{t.name}</div>
                  <div className="text-xs text-[oklch(0.74_0.21_218)]">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ───────────────────────────────────── */}
        <div className="max-w-2xl mx-auto px-4 pb-16">
          <h2 className="text-2xl font-black text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="glass-card rounded-2xl divide-y divide-white/6">
            {[
              { q: "Can I cancel anytime?",            a: "Yes! Cancel from your account settings. Access continues until the end of your billing period." },
              { q: "What payment methods are accepted?", a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and Apple Pay." },
              { q: "Is there a free trial?",            a: "New subscribers get a 7-day free trial on Basic and Premium plans. No credit card required." },
              { q: "Can I switch plans?",               a: "Yes, upgrade or downgrade anytime. Changes take effect at the start of your next billing cycle." },
              { q: "How does the 70% creator revenue share work?", a: "70% of subscription revenue is distributed to creators based on watch time and engagement." },
            ].map((faq) => (
              <div key={faq.q} className="p-5">
                <p className="text-sm font-bold text-white mb-2">{faq.q}</p>
                <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FINAL CTA ─────────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="relative overflow-hidden rounded-3xl p-10 text-center
            bg-gradient-to-r from-[oklch(0.74_0.21_218/0.15)] via-[oklch(0.56_0.24_290/0.1)] to-[oklch(0.74_0.21_218/0.15)]
            border border-[oklch(0.74_0.21_218/0.25)]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[oklch(0.08_0.012_264/0.5)] pointer-events-none" />
            <div className="relative">
              <Crown className="w-12 h-12 text-[oklch(0.74_0.21_218)] mx-auto mb-4" />
              <h2 className="text-3xl font-black text-white mb-3">Ready to go premium?</h2>
              <p className="text-white/55 mb-6 max-w-md mx-auto">
                Join 12,400+ members watching ad-free, earning rewards, and supporting creators.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button onClick={() => handleSubscribe("premium")}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] text-white font-black text-sm hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[oklch(0.74_0.21_218/0.3)]">
                  <Crown className="w-4 h-4" />
                  Start 7-Day Free Trial
                </button>
                <Link href="/creator">
                  <button className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold text-sm transition-all">
                    <Tv className="w-4 h-4" />
                    Become a Creator
                  </button>
                </Link>
              </div>
              <p className="text-xs text-white/30 mt-4">No credit card required · Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
