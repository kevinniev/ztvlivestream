import { SEO, breadcrumbSchema } from "@/components/SEO";
import { Shield, Lock, Eye, UserCheck, Globe, AlertTriangle, CheckCircle, FileText, Mail } from "lucide-react";
import { Link } from "wouter";

const SECTIONS = [
  {
    icon: Shield,
    title: "Platform Safety",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    items: [
      "All content is reviewed against our Community Guidelines before and after publication.",
      "AI-assisted moderation flags potentially harmful content for human review within 24 hours.",
      "Zero tolerance for content involving minors in harmful situations (CSAM) — immediately removed and reported to NCMEC.",
      "Dedicated Trust & Safety team available 24/7 to respond to urgent reports.",
    ],
  },
  {
    icon: Lock,
    title: "Data Security",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    items: [
      "All data is encrypted in transit (TLS 1.3) and at rest (AES-256).",
      "We never sell your personal data to third parties.",
      "Payment information is processed exclusively through Stripe — we never store card numbers.",
      "Regular third-party security audits and penetration testing.",
      "SOC 2 Type II compliance in progress.",
    ],
  },
  {
    icon: Eye,
    title: "Privacy Commitments",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    items: [
      "GDPR compliant for European users — full data portability and right to erasure.",
      "CCPA compliant for California residents — opt-out of data sale available.",
      "COPPA compliant — we do not knowingly collect data from children under 13.",
      "Minimal data collection — we only collect what's needed to provide the service.",
      "You can request a full export or deletion of your data at any time via privacy@ztvlivestream.com.",
    ],
  },
  {
    icon: UserCheck,
    title: "Creator Protections",
    color: "text-green-400",
    bg: "bg-green-500/10",
    items: [
      "You retain 100% ownership of your content — ZTVLIVE only has a license to distribute.",
      "Transparent revenue reporting — real-time earnings dashboard with weekly payouts.",
      "DMCA takedown process protects your original content from unauthorized use.",
      "Appeals process for any content removal decisions — reviewed by a human within 72 hours.",
      "No arbitrary demonetization — clear, written criteria for revenue eligibility.",
    ],
  },
  {
    icon: Globe,
    title: "Advertising Standards",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    items: [
      "All advertisers must comply with our Ad Policy before campaigns go live.",
      "No deceptive, misleading, or predatory advertising allowed.",
      "Ads are clearly labeled and distinguishable from organic content.",
      "Viewers can report ads that violate our policies.",
      "Children's content is protected from behavioral advertising.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Reporting & Enforcement",
    color: "text-red-400",
    bg: "bg-red-500/10",
    items: [
      "Report any content or account using the flag button on any video or profile.",
      "Reports are reviewed within 24 hours; urgent safety reports within 1 hour.",
      "Repeat violators face escalating penalties: warning → demonetization → suspension → ban.",
      "Law enforcement requests are handled through our legal team at legal@ztvlivestream.com.",
      "Transparency report published quarterly showing enforcement actions.",
    ],
  },
];

const COMPLIANCE = [
  { name: "GDPR", region: "European Union", status: "Compliant", color: "text-green-400" },
  { name: "CCPA", region: "California, USA", status: "Compliant", color: "text-green-400" },
  { name: "COPPA", region: "United States", status: "Compliant", color: "text-green-400" },
  { name: "DMCA", region: "United States", status: "Compliant", color: "text-green-400" },
  { name: "CAN-SPAM", region: "United States", status: "Compliant", color: "text-green-400" },
  { name: "SOC 2 Type II", region: "Global", status: "In Progress", color: "text-yellow-400" },
];

export default function TrustCenter() {
  const schemas = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Trust Center", url: "/trust-center" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Trust & Safety Center | ZTVLIVE"
        description="ZTVLIVE Trust & Safety Center. Learn how we protect creators, viewers, and advertisers. COPPA, CCPA, GDPR compliance, data security, and content moderation policies."
        url="/trust-center"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="relative overflow-hidden pt-16 pb-12 border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.74_0.21_218/0.05)] to-[oklch(0.56_0.24_290/0.05)] pointer-events-none" />
          <div className="relative max-w-[1000px] mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4" />
              Trust & Safety Center
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Your Safety Is Our Priority
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              ZTVLIVE is committed to maintaining a safe, transparent, and fair platform for creators, viewers, and advertisers. Here's how we protect you.
            </p>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Regulatory Compliance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {COMPLIANCE.map((c) => (
              <div key={c.name} className="flex flex-col items-center p-4 rounded-xl bg-white/3 border border-white/8 text-center">
                <span className={`text-lg font-black ${c.color}`}>{c.name}</span>
                <span className="text-xs text-white/40 mt-1">{c.region}</span>
                <span className={`text-xs font-medium mt-2 ${c.color}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Sections */}
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 pb-16">
          <div className="grid gap-6">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="rounded-2xl bg-white/3 border border-white/8 p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2.5 rounded-xl ${section.bg}`}>
                      <Icon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <h2 className="text-xl font-bold text-white">{section.title}</h2>
                  </div>
                  <ul className="space-y-3">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-white/65 text-sm leading-relaxed">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Contact */}
          <div className="mt-10 rounded-2xl bg-gradient-to-br from-[oklch(0.74_0.21_218/0.08)] to-[oklch(0.56_0.24_290/0.08)] border border-white/10 p-8 text-center">
            <Mail className="w-10 h-10 text-[oklch(0.74_0.21_218)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Contact Trust & Safety</h2>
            <p className="text-white/55 mb-6 max-w-lg mx-auto">
              Have a safety concern, legal inquiry, or compliance question? Our team responds within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:safety@ztvlivestream.com"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[oklch(0.74_0.21_218)] text-[oklch(0.08_0.01_264)] font-bold hover:opacity-90 transition-opacity"
              >
                <Shield className="w-4 h-4" />
                Report Safety Issue
              </a>
              <a
                href="mailto:legal@ztvlivestream.com"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-white/70 hover:border-white/30 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Legal Inquiries
              </a>
            </div>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "DMCA Policy", href: "/dmca" },
              { label: "Content Guidelines", href: "/content-guidelines" },
              { label: "Community Guidelines", href: "/community-guidelines" },
              { label: "Ad Policy", href: "/ad-policy" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white/80 hover:border-white/20 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
