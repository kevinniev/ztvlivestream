import { SEO, breadcrumbSchema } from "@/components/SEO";

export default function DMCA() {
  return (
    <>
      <SEO title="DMCA Policy" description="ZTVLIVE DMCA Policy. How to submit copyright takedown notices and counter-notices." url="/dmca"
        schema={[breadcrumbSchema([{ name: "Home", url: "/" }, { name: "DMCA Policy", url: "/dmca" }])]} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-2">DMCA Policy</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: January 1, 2025</p>
        <div className="space-y-4">
          {[
            { heading: "Overview", body: "ZTVLIVE respects the intellectual property rights of others and expects our users to do the same. In accordance with the Digital Millennium Copyright Act (DMCA), we will respond to notices of alleged copyright infringement." },
            { heading: "Filing a DMCA Takedown Notice", body: "To file a DMCA takedown notice, you must provide: (1) A physical or electronic signature of the copyright owner or authorized agent; (2) Identification of the copyrighted work claimed to have been infringed; (3) Identification of the material that is claimed to be infringing, with enough detail to locate it; (4) Your contact information; (5) A statement that you have a good faith belief that the use is not authorized; (6) A statement that the information in the notice is accurate and that you are authorized to act on behalf of the copyright owner." },
            { heading: "Where to Send Notices", body: "Send DMCA notices to: DMCA Agent, ZTVLIVE, 123 Stream Ave, Miami, FL 33101. Email: dmca@ztvlivestream.com. We will process valid notices within 5-7 business days." },
            { heading: "Counter-Notification", body: "If you believe your content was removed in error, you may file a counter-notification. Your counter-notification must include: (1) Your physical or electronic signature; (2) Identification of the removed material and its former location; (3) A statement under penalty of perjury that you have a good faith belief the material was removed by mistake; (4) Your name, address, and phone number; (5) A statement that you consent to the jurisdiction of the Federal District Court." },
            { heading: "Repeat Infringers", body: "ZTVLIVE has a policy of terminating accounts of users who are repeat infringers of copyright. We reserve the right to terminate any user's account at our sole discretion." },
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
