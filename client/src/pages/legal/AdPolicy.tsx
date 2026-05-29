import { SEO, breadcrumbSchema } from "@/components/SEO";

export default function AdPolicy() {
  return (
    <>
      <SEO title="Ad Policy" description="ZTVLIVE Ad Policy. Our advertising standards and policies for advertisers and viewers." url="/ad-policy"
        schema={[breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Ad Policy", url: "/ad-policy" }])]} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-2">Ad Policy</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: January 1, 2025</p>
        <div className="space-y-4">
          {[
            { heading: "Our Advertising Standards", body: "ZTVLIVE maintains strict advertising standards to ensure a positive experience for our viewers. All advertisements must comply with applicable laws and our content guidelines." },
            { heading: "Types of Ads on ZTVLIVE", body: "We serve pre-roll ads (before videos), mid-roll ads (during longer videos), display ads (banners), and sponsored content. ZTVLIVE+ Premium and Creator Pro subscribers enjoy an ad-free experience." },
            { heading: "Prohibited Ad Content", body: "We do not accept ads for: illegal products or services, tobacco or vaping products, adult content, gambling (without proper licensing), misleading or deceptive claims, or content targeting children under 13." },
            { heading: "Advertiser Transparency", body: "All sponsored content is clearly labeled as 'Sponsored' or 'Ad'. We do not allow native advertising that disguises ads as organic content." },
            { heading: "COPPA Compliance", body: "We do not serve behavioral advertising to users under 13. Content directed at children is served with limited, contextual advertising only." },
            { heading: "Ad Choices", body: "Viewers can opt out of personalized advertising through our Privacy Settings. ZTVLIVE+ subscribers can remove all advertising from their experience." },
            { heading: "Advertiser Inquiries", body: "For advertising opportunities, sponsored content, or category sponsorships, contact our sales team at ads@ztvlivestream.com." },
          ].map((s) => (
            <div key={s.heading} className="glass-card rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-2">{s.heading}</h2>
              <p className="text-sm text-white/60 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
