import { SEO, breadcrumbSchema } from "@/components/SEO";

export default function CommunityGuidelines() {
  return (
    <>
      <SEO title="Community Guidelines" description="ZTVLIVE Community Guidelines. How to be a positive member of the ZTVLIVE community." url="/community-guidelines"
        schema={[breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Community Guidelines", url: "/community-guidelines" }])]} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-2">Community Guidelines</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: January 1, 2025</p>
        <div className="space-y-4">
          {[
            { heading: "Be Respectful", body: "Treat all community members with respect. Disagreements are fine, but personal attacks, harassment, or bullying will not be tolerated. Remember there's a real person behind every account." },
            { heading: "No Hate Speech", body: "Content or comments that promote hatred, discrimination, or violence against individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or nationality are strictly prohibited." },
            { heading: "Keep It Legal", body: "Do not post content that is illegal, promotes illegal activities, or violates anyone's rights. This includes piracy, fraud, and sharing of personal information without consent." },
            { heading: "No Spam", body: "Do not post repetitive messages, unsolicited advertisements, or irrelevant content. Self-promotion is allowed in moderation but excessive promotion will be removed." },
            { heading: "Protect Privacy", body: "Do not share personal information about others without their consent. This includes addresses, phone numbers, financial information, or any other private details." },
            { heading: "Report Violations", body: "Help keep our community safe by reporting content or behavior that violates these guidelines. Use the report button or contact us at community@ztvlivestream.com." },
            { heading: "Enforcement", body: "Violations of community guidelines may result in content removal, temporary suspension, or permanent account termination depending on severity and frequency." },
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
