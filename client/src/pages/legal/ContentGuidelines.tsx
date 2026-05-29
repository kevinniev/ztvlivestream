import { SEO, breadcrumbSchema } from "@/components/SEO";
import { CheckCircle, XCircle } from "lucide-react";

export default function ContentGuidelines() {
  return (
    <>
      <SEO title="Content Guidelines" description="ZTVLIVE Content Guidelines. What content is allowed and prohibited on our platform." url="/content-guidelines"
        schema={[breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Content Guidelines", url: "/content-guidelines" }])]} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-2">Content Guidelines</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: January 1, 2025</p>
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-4">Allowed Content</h2>
            <div className="space-y-2">
              {["Original content you own the rights to", "Tech reviews and tutorials", "Gaming content and commentary", "Sports highlights and commentary (with proper licensing)", "Movie and TV reviews", "Podcasts and interviews", "News commentary and analysis", "Music performances (original or licensed)", "Educational and informational content", "Family-friendly entertainment"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[oklch(0.65_0.22_150)] shrink-0" />
                  <span className="text-sm text-white/70">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-4">Prohibited Content</h2>
            <div className="space-y-2">
              {["Copyrighted content without proper licensing", "Hate speech, racism, or discrimination", "Harassment, bullying, or threats", "Sexually explicit or pornographic content", "Violence, gore, or graphic content", "Misinformation or deliberately false news", "Spam, repetitive, or low-effort content", "Content involving minors in inappropriate contexts", "Illegal activities or instructions", "Malware, phishing, or scam content"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-[oklch(0.6_0.22_25)] shrink-0" />
                  <span className="text-sm text-white/70">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-2">Enforcement</h2>
            <p className="text-sm text-white/60 leading-relaxed">Content that violates these guidelines will be removed. Creators who repeatedly violate guidelines may have their accounts suspended or terminated. We review all content before it goes live on the platform.</p>
          </div>
        </div>
      </div>
    </>
  );
}
