import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Twitter, Youtube, Instagram, Facebook, Send, ArrowRight, Crown, Radio } from "lucide-react";

const footerLinks = {
  Watch: [
    { label: "Live TV",          href: "/live" },
    { label: "Video Library",    href: "/library" },
    { label: "Program Schedule", href: "/schedule" },
    { label: "Quiz Game",        href: "/quiz" },
    { label: "My Watchlist",     href: "/watchlist" },
  ],
  Creators: [
    { label: "Become a Creator",    href: "/creator" },
    { label: "Creator Dashboard",   href: "/creator/dashboard" },
    { label: "Upload Slot Booking", href: "/creator/book-slot" },
    { label: "Rights & Legal",      href: "/creator/rights" },
  ],
  Subscribe: [
    { label: "ZTVLIVE+ Plans",  href: "/subscribe" },
    { label: "Free vs Premium", href: "/subscribe#compare" },
    { label: "Creator Pro",     href: "/subscribe#creator-pro" },
  ],
  Legal: [
    { label: "Terms of Service",     href: "/terms" },
    { label: "Privacy Policy",       href: "/privacy" },
    { label: "DMCA Policy",          href: "/dmca" },
    { label: "Content Guidelines",   href: "/content-guidelines" },
    { label: "Community Guidelines", href: "/community-guidelines" },
    { label: "Ad Policy",            href: "/ad-policy" },
    { label: "Trust Center",          href: "/trust-center" },
    { label: "Contact Us",           href: "mailto:hello@ztvlivestream.com" },
  ],
};

const socialLinks = [
  { icon: Twitter,   href: "https://twitter.com/ztvlivestream",   label: "Twitter",   hoverColor: "hover:text-sky-400 hover:border-sky-400/30" },
  { icon: Youtube,   href: "https://youtube.com/@ztvlivestream",  label: "YouTube",   hoverColor: "hover:text-red-400 hover:border-red-400/30" },
  { icon: Instagram, href: "https://instagram.com/ztvlivestream", label: "Instagram", hoverColor: "hover:text-pink-400 hover:border-pink-400/30" },
  { icon: Facebook,  href: "https://facebook.com/ztvlivestream",  label: "Facebook",  hoverColor: "hover:text-blue-400 hover:border-blue-400/30" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: (data) => {
      if (data.alreadySubscribed) {
        toast.info("You're already subscribed!");
      } else {
        toast.success("You're subscribed! Weekly drops incoming. 🎉");
        setSubscribed(true);
      }
      setEmail("");
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate({ email: email.trim() });
  };

  return (
    <footer className="relative mt-16">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[oklch(0.74_0.21_218/0.5)] to-transparent" />

      {/* Newsletter strip */}
      <div className="bg-gradient-to-r from-[oklch(0.74_0.21_218/0.07)] via-[oklch(0.56_0.24_290/0.05)] to-[oklch(0.74_0.21_218/0.07)] border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Stay in the loop</h3>
              <p className="text-sm text-white/45">Weekly drops on what's airing, who's playing, and creator tips.</p>
            </div>
            {subscribed ? (
              <div className="flex items-center gap-2 text-green-400 font-semibold text-sm bg-green-400/10 border border-green-400/20 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                You're subscribed!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 md:w-64 bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm
                    text-white placeholder-white/30 outline-none
                    focus:border-[oklch(0.74_0.21_218/0.5)] focus:bg-white/8 transition-all"
                />
                <button type="submit" disabled={subscribe.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                    bg-[oklch(0.74_0.21_218)] text-[oklch(0.06_0.012_264)]
                    text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shrink-0">
                  <Send className="w-3.5 h-3.5" />
                  {subscribe.isPending ? "..." : "Subscribe"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main footer body */}
      <div className="bg-[oklch(0.07_0.01_264)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">

            {/* Brand column */}
            <div className="col-span-2 lg:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)]
                  flex items-center justify-center shadow-md shadow-[oklch(0.74_0.21_218/0.25)]">
                  <Radio className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-xl font-black tracking-tight">
                  <span className="text-[oklch(0.74_0.21_218)]">ZTV</span>
                  <span className="text-white">LIVE</span>
                </span>
              </Link>

              <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-xs">
                24/7 live TV streaming. Creators. Concerts. Quiz games. The world is watching.
              </p>

              {/* Social */}
              <div className="flex items-center gap-2.5 mb-6">
                {socialLinks.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className={`w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center
                      text-white/45 ${s.hoverColor} hover:bg-white/8 transition-all duration-150`}>
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>

              {/* ZTVLIVE+ mini promo */}
              <Link href="/subscribe">
                <div className="flex items-center gap-3 p-3.5 rounded-xl
                  bg-gradient-to-r from-[oklch(0.74_0.21_218/0.1)] to-[oklch(0.56_0.24_290/0.07)]
                  border border-[oklch(0.74_0.21_218/0.2)] hover:border-[oklch(0.74_0.21_218/0.45)]
                  transition-all duration-150 cursor-pointer group">
                  <Crown className="w-5 h-5 text-[oklch(0.74_0.21_218)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">Get ZTVLIVE+</div>
                    <div className="text-xs text-white/35">Ad-free · Exclusive content</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/25 group-hover:text-[oklch(0.74_0.21_218)] transition-colors" />
                </div>
              </Link>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <h4 className="text-[10px] font-black text-white/35 uppercase tracking-[0.12em] mb-4">{section}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("mailto:") ? (
                        <a href={link.href}
                          className="text-sm text-white/45 hover:text-white transition-colors duration-150">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href}
                          className="text-sm text-white/45 hover:text-white transition-colors duration-150">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/25">
              © {new Date().getFullYear()} ZTVLIVE Stream — All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {[
                { label: "Terms",   href: "/terms" },
                { label: "Privacy", href: "/privacy" },
                { label: "DMCA",    href: "/dmca" },
              ].map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-xs text-white/25 hover:text-white/55 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
