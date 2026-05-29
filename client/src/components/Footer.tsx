import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Twitter, Youtube, Instagram, Facebook, Mail, ArrowRight } from "lucide-react";

const footerLinks = {
  Watch: [
    { label: "Live TV", href: "/live" },
    { label: "Video Library", href: "/library" },
    { label: "Program Schedule", href: "/schedule" },
    { label: "Quiz Game", href: "/quiz" },
  ],
  Creators: [
    { label: "Become a Creator", href: "/creator" },
    { label: "Creator Dashboard", href: "/creator/dashboard" },
    { label: "Upload Slot Booking", href: "/creator/book-slot" },
    { label: "Rights & Legal", href: "/creator/rights" },
  ],
  Subscribe: [
    { label: "ZTVLIVE+ Plans", href: "/subscribe" },
    { label: "Free vs Premium", href: "/subscribe#compare" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "DMCA Policy", href: "/dmca" },
    { label: "Content Guidelines", href: "/content-guidelines" },
    { label: "Community Guidelines", href: "/community-guidelines" },
    { label: "Ad Policy", href: "/ad-policy" },
    { label: "Contact Us", href: "mailto:hello@ztvlivestream.com" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/ztvlivestream", label: "Twitter" },
  { icon: Youtube, href: "https://youtube.com/@ztvlivestream", label: "YouTube" },
  { icon: Instagram, href: "https://instagram.com/ztvlivestream", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com/ztvlivestream", label: "Facebook" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: (data) => {
      if (data.alreadySubscribed) {
        toast.info("You're already subscribed!");
      } else {
        toast.success("You're subscribed! Weekly drops incoming.");
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
    <footer className="bg-[oklch(0.07_0.01_264)] border-t border-white/5 mt-16">
      {/* Newsletter strip */}
      <div className="border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[oklch(0.72_0.2_220/0.15)] flex items-center justify-center">
              <Mail className="w-5 h-5 text-[oklch(0.72_0.2_220)]" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Stay in the loop</p>
              <p className="text-xs text-white/50">Weekly drops on what's airing, who's playing, and creator tips.</p>
            </div>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[oklch(0.72_0.2_220/0.5)] w-full md:w-64"
              required
            />
            <Button
              type="submit"
              disabled={subscribe.isPending}
              className="bg-[oklch(0.72_0.2_220)] hover:bg-[oklch(0.65_0.2_220)] text-[oklch(0.08_0.01_264)] font-semibold shrink-0"
            >
              {subscribe.isPending ? "..." : <><ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-1 mb-4">
              <span className="text-xl font-black gradient-text">ZTV</span>
              <span className="text-xl font-black text-white">LIVE</span>
            </Link>
            <p className="text-xs text-white/40 leading-relaxed mb-4 max-w-xs">
              24/7 live TV streaming. Creators. Concerts. Quiz games. The world is watching.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-[oklch(0.72_0.2_220/0.2)] flex items-center justify-center text-white/50 hover:text-[oklch(0.72_0.2_220)] transition-all"
                >
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
                {section}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("mailto:") ? (
                      <a
                        href={link.href}
                        className="text-xs text-white/40 hover:text-white/80 transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-white/40 hover:text-white/80 transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} ZTVLIVE Stream — All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-white/25 hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-white/25 hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/dmca" className="text-xs text-white/25 hover:text-white/50 transition-colors">DMCA</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
