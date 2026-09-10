import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function ReferralLanding() {
  const [, params] = useRoute("/partner/:token");
  const token = params?.token ?? "";
  const { data: program } = trpc.referrals.programStatus.useQuery();
  const { isLoading } = trpc.referrals.lookupEnrollment.useQuery(
    { token },
    { enabled: token.length >= 20 && program?.mode === "staging_demo" }
  );
  const canInspectInvitation = program?.mode === "staging_demo";

  return (
    <main className="min-h-screen bg-[#090914] px-4 py-16 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.045] p-7 sm:p-10">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-200"><ShieldCheck className="h-6 w-6" /></div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-cyan-200">ZTVLIVE partner program</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Private referral invitation</h1>
        {canInspectInvitation && isLoading ? <p className="mt-4 text-white/60">Checking the private invitation…</p> : (
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
            <div className="flex gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><div><p className="font-semibold text-amber-50">Program activation is pending</p><p className="mt-1 text-sm leading-6 text-amber-50/70">This invitation is not active. ZTVLIVE has not enrolled partners, sent emails, opened referral tracking, or enabled rewards. Please do not submit client information through this page.</p></div></div>
          </div>
        )}
        <p className="mt-6 text-sm leading-6 text-white/50">When the program is legally reviewed and formally activated, eligible partners will receive a new confirmed invitation through an approved channel.</p>
        <Link href="/"><Button variant="outline" className="mt-7 border-white/20 bg-transparent text-white hover:bg-white/10">Return to ZTVLIVE</Button></Link>
      </section>
    </main>
  );
}
