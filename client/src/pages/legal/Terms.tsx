import { SEO, breadcrumbSchema } from "@/components/SEO";
import { Link } from "wouter";

function LegalPage({ title, url, lastUpdated, sections }: {
  title: string; url: string; lastUpdated: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <>
      <SEO title={title} description={`ZTVLIVE ${title}. Read our policies and terms.`} url={url}
        schema={[breadcrumbSchema([{ name: "Home", url: "/" }, { name: title, url }])]} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: {lastUpdated}</p>
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.heading} className="glass-card rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-2">{s.heading}</h2>
              <p className="text-sm text-white/60 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-xs text-white/30">Questions? <a href="mailto:legal@ztvlivestream.com" className="text-[oklch(0.72_0.2_220)] hover:underline">legal@ztvlivestream.com</a></p>
        </div>
      </div>
    </>
  );
}

export default function Terms() {
  return <LegalPage
    title="Terms of Service"
    url="/terms"
    lastUpdated="January 1, 2025"
    sections={[
      { heading: "1. Acceptance of Terms", body: "By accessing or using ZTVLIVE, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service." },
      { heading: "2. Use of Service", body: "ZTVLIVE grants you a limited, non-exclusive, non-transferable license to access and use the service for personal, non-commercial purposes. You may not reproduce, distribute, or create derivative works from our content." },
      { heading: "3. User Accounts", body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use." },
      { heading: "4. Content Policy", body: "Users may not upload, post, or transmit content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable. We reserve the right to remove any content that violates these terms." },
      { heading: "5. Subscription and Billing", body: "ZTVLIVE+ subscriptions are billed monthly or annually. Subscriptions automatically renew unless cancelled. Refunds are provided at our discretion within 7 days of purchase." },
      { heading: "6. Intellectual Property", body: "All content on ZTVLIVE, including but not limited to text, graphics, logos, and software, is the property of ZTVLIVE or its content suppliers and is protected by copyright laws." },
      { heading: "7. Limitation of Liability", body: "ZTVLIVE shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service." },
      { heading: "8. Governing Law", body: "These Terms shall be governed by the laws of the State of Florida, United States, without regard to its conflict of law provisions." },
      { heading: "9. SMS Communications", body: "By opting in to ZTVLIVE SMS alerts, you consent to receive recurring automated text messages from ZTVLIVE at the mobile number you provided. Message frequency: up to 4 messages per month. Standard message and data rates may apply. Consent is not a condition of any purchase. To opt out at any time, reply STOP to any message. For help, reply HELP or contact admin@communitycut.com. ZTVLIVE will not share your phone number with third parties for their marketing purposes." },
      { heading: "10. Changes to Terms", body: "We reserve the right to modify these terms at any time. We will notify users of significant changes via email or prominent notice on the service." },
    ]}
  />;
}
