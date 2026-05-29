import { SEO, breadcrumbSchema } from "@/components/SEO";

export default function Privacy() {
  return (
    <>
      <SEO title="Privacy Policy" description="ZTVLIVE Privacy Policy. How we collect, use, and protect your personal information." url="/privacy"
        schema={[breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Privacy Policy", url: "/privacy" }])]} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: January 1, 2025</p>
        <div className="space-y-4">
          {[
            { heading: "Information We Collect", body: "We collect information you provide directly (name, email, payment info), information from your use of our service (viewing history, quiz scores, watchlist), and technical information (IP address, browser type, device info)." },
            { heading: "How We Use Your Information", body: "We use your information to provide and improve our service, personalize your experience, process payments, send service updates, and comply with legal obligations. We do not sell your personal information to third parties." },
            { heading: "Cookies and Tracking", body: "We use cookies and similar technologies to maintain your session, remember preferences, and analyze usage. You can control cookies through your browser settings. Disabling cookies may affect service functionality." },
            { heading: "Data Sharing", body: "We may share your information with service providers who assist in our operations (payment processors, analytics providers), when required by law, or with your consent. We require all third parties to respect your privacy." },
            { heading: "Data Retention", body: "We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time." },
            { heading: "GDPR Rights (EU Users)", body: "If you are in the EU, you have the right to access, correct, delete, restrict processing, and port your data. You also have the right to object to processing and to withdraw consent. Contact us to exercise these rights." },
            { heading: "CCPA Rights (California Users)", body: "California residents have the right to know what personal information we collect, request deletion, and opt-out of sale. We do not sell personal information. Contact us to exercise your rights." },
            { heading: "COPPA Compliance", body: "ZTVLIVE is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it promptly." },
            { heading: "Contact Us", body: "For privacy questions or to exercise your rights, contact our Privacy Team at privacy@ztvlivestream.com or write to ZTVLIVE Privacy, 123 Stream Ave, Miami, FL 33101." },
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
