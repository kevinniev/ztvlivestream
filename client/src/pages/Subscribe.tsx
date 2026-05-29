import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, Check, X, Zap, Shield, Star, ArrowRight } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    color: "oklch(0.6 0.05 264)",
    description: "Get started with ZTVLIVE for free",
    features: [
      { label: "Live TV streaming", included: true },
      { label: "Video library access", included: true },
      { label: "Daily quiz game", included: true },
      { label: "Program schedule", included: true },
      { label: "Ad-free experience", included: false },
      { label: "Exclusive content", included: false },
      { label: "Premium quiz mode", included: false },
      { label: "Priority support", included: false },
      { label: "Creator Pro tools", included: false },
    ],
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    id: "basic",
    name: "Basic",
    price: "$4.99",
    period: "per month",
    color: "oklch(0.72 0.2 220)",
    description: "Enhanced streaming with fewer interruptions",
    popular: false,
    features: [
      { label: "Live TV streaming", included: true },
      { label: "Video library access", included: true },
      { label: "Daily quiz game", included: true },
      { label: "Program schedule", included: true },
      { label: "Reduced ads (50% fewer)", included: true },
      { label: "Exclusive content", included: false },
      { label: "Premium quiz mode", included: false },
      { label: "Priority support", included: false },
      { label: "Creator Pro tools", included: false },
    ],
    cta: "Get Basic",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$9.99",
    period: "per month",
    color: "oklch(0.65 0.25 290)",
    description: "The full ZTVLIVE+ experience",
    popular: true,
    features: [
      { label: "Live TV streaming", included: true },
      { label: "Video library access", included: true },
      { label: "Daily quiz game", included: true },
      { label: "Program schedule", included: true },
      { label: "Ad-free experience", included: true },
      { label: "Exclusive content", included: true },
      { label: "Premium quiz mode", included: true },
      { label: "Priority support", included: true },
      { label: "Creator Pro tools", included: false },
    ],
    cta: "Get Premium",
  },
  {
    id: "creator-pro",
    name: "Creator Pro",
    price: "$14.99",
    period: "per month",
    color: "oklch(0.75 0.18 60)",
    description: "Everything in Premium + creator tools",
    features: [
      { label: "Live TV streaming", included: true },
      { label: "Video library access", included: true },
      { label: "Daily quiz game", included: true },
      { label: "Program schedule", included: true },
      { label: "Ad-free experience", included: true },
      { label: "Exclusive content", included: true },
      { label: "Premium quiz mode", included: true },
      { label: "Priority support", included: true },
      { label: "Creator Pro tools + Live streaming", included: true },
    ],
    cta: "Get Creator Pro",
  },
];

export default function Subscribe() {
  const { isAuthenticated } = useAuth();

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) {
      toast.info("Sign in to subscribe", {
        action: { label: "Sign In", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    toast.info("Payment integration coming soon! Contact us at hello@ztvlivestream.com to subscribe.");
  };

  const schemas = [breadcrumbSchema([{ name: "Home", url: "/" }, { name: "ZTVLIVE+ Plans", url: "/subscribe" }])];

  return (
    <>
      <SEO
        title="ZTVLIVE+ — Premium Streaming Plans"
        description="Upgrade to ZTVLIVE+. Choose from Basic ($4.99), Premium ($9.99), or Creator Pro ($14.99). Ad-free streaming, exclusive content, and premium quiz mode."
        url="/subscribe"
        schema={schemas}
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[oklch(0.72_0.2_220/0.1)] border border-[oklch(0.72_0.2_220/0.3)] text-[oklch(0.72_0.2_220)] text-sm font-semibold mb-6">
            <Crown className="w-4 h-4" />
            ZTVLIVE+
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Unlock the full <span className="gradient-text">ZTVLIVE+</span> experience
          </h1>
          <p className="text-white/60 text-base max-w-xl mx-auto">
            Ad-free streaming, exclusive content, premium quiz mode, and creator tools. Cancel anytime.
          </p>
        </div>

        {/* Plans */}
        <div id="compare" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col border transition-all ${
                plan.popular
                  ? "border-[oklch(0.65_0.25_290/0.5)] bg-[oklch(0.65_0.25_290/0.05)]"
                  : "glass-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[oklch(0.65_0.25_290)] text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4" style={{ color: plan.color }} />
                  <span className="text-sm font-bold text-white">{plan.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-white/40">/{plan.period}</span>
                </div>
                <p className="text-xs text-white/50">{plan.description}</p>
              </div>

              <div className="flex-1 space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <div key={feature.label} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="w-3.5 h-3.5 text-[oklch(0.65_0.22_150)] shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-white/20 shrink-0" />
                    )}
                    <span className={`text-xs ${feature.included ? "text-white/70" : "text-white/25"}`}>
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => !plan.ctaDisabled && handleSubscribe(plan.id)}
                disabled={plan.ctaDisabled}
                className={`w-full font-bold text-sm ${
                  plan.ctaDisabled
                    ? "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                    : plan.popular
                    ? "bg-gradient-to-r from-[oklch(0.65_0.25_290)] to-[oklch(0.72_0.2_220)] text-white border-0 hover:opacity-90"
                    : "border border-white/20 text-white hover:bg-white/10 bg-transparent"
                }`}
              >
                {plan.cta}
                {!plan.ctaDisabled && <ArrowRight className="w-3.5 h-3.5 ml-2" />}
              </Button>
            </div>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Zap, title: "Ad-Free Streaming", desc: "Watch without interruptions. No pre-roll, mid-roll, or display ads.", color: "oklch(0.72 0.2 220)" },
            { icon: Star, title: "Exclusive Content", desc: "Access premium shows, behind-the-scenes content, and early releases.", color: "oklch(0.65 0.25 290)" },
            { icon: Shield, title: "Cancel Anytime", desc: "No contracts, no commitments. Cancel your subscription at any time.", color: "oklch(0.65 0.22 150)" },
          ].map((item) => (
            <div key={item.title} className="glass-card rounded-2xl p-6 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-6">Frequently Asked Questions</h2>
          <div className="glass-card rounded-2xl divide-y divide-white/10">
            {[
              { q: "Can I cancel anytime?", a: "Yes! You can cancel your ZTVLIVE+ subscription at any time from your account settings. Your access continues until the end of your billing period." },
              { q: "What payment methods are accepted?", a: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay." },
              { q: "Is there a free trial?", a: "New subscribers get a 7-day free trial on Basic and Premium plans. No credit card required for the trial." },
              { q: "Can I switch plans?", a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle." },
            ].map((faq) => (
              <div key={faq.q} className="p-5">
                <p className="text-sm font-semibold text-white mb-2">{faq.q}</p>
                <p className="text-xs text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
