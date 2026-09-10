import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Copy, LockKeyhole, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

const statusSteps = [
  ["1", "Email enrollment", "Admin creates a provisional invitation. Delivery stays simulated until legal approval."],
  ["2", "Qualification and rights", "Verify source evidence, content ownership, client consent, and no self-referral or duplicate conflict."],
  ["3", "Private attribution", "A private token is held server-side. No public reward is calculated from raw visits or clicks."],
  ["4", "Manual reward review", "Only verified, qualified referrals may enter a non-payment decision queue."],
];

export default function ReferralDesk() {
  const { user, loading } = useAuth();
  const canView = Boolean(user?.role === "admin");
  const { data: status } = trpc.referrals.programStatus.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.referrals.adminSummary.useQuery(undefined, { enabled: canView });
  const { data: partners } = trpc.referrals.listPartners.useQuery(undefined, { enabled: canView });
  const { data: reviews } = trpc.referrals.listRewardReviews.useQuery(undefined, { enabled: canView });
  const utils = trpc.useUtils();
  const inviteMutation = trpc.referrals.createProvisionalInvite.useMutation({
    onSuccess: () => utils.referrals.listPartners.invalidate(),
  });
  const reviewMutation = trpc.referrals.reviewReward.useMutation({
    onSuccess: () => utils.referrals.listRewardReviews.invalidate(),
  });
  const [invite, setInvite] = useState({ name: "", email: "", organization: "" });
  const programLocked = status?.mode !== "staging_demo";

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    if (programLocked || !invite.name || !invite.email) return;
    inviteMutation.mutate({ name: invite.name, email: invite.email, organization: invite.organization || undefined });
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a14] grid place-items-center text-white/60">Loading referral desk…</div>;
  if (!canView) return (
    <div className="min-h-screen bg-[#0a0a14] text-white grid place-items-center p-6">
      <section className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-violet-300" />
        <h1 className="text-xl font-bold">Referral Desk is restricted</h1>
        <p className="mt-2 text-sm text-white/60">This staging-only workspace is available to ZTVLIVE administrators. Partner enrollment and referral activation are disabled.</p>
        <Link href="/"><Button className="mt-5">Return home</Button></Link>
      </section>
    </div>
  );

  const cards = [
    ["Partners", summary?.partners ?? 0, "All records remain provisional", UsersRound],
    ["Provisional", summary?.provisional ?? 0, "Awaiting legal and evidence review", ShieldCheck],
    ["Attribution holds", summary?.heldAttributions ?? 0, "No conversion or reward release", Copy],
    ["Manual reviews", summary?.manualReviews ?? 0, "Non-payment decision queue only", Mail],
  ] as const;

  return (
    <main className="min-h-screen bg-[#0a0a14] text-white p-4 sm:p-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-start gap-4">
            <Link href="/admin"><Button variant="ghost" size="icon" className="text-white/70 hover:text-white"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back to Admin Dashboard</span></Button></Link>
            <div>
              <div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight">REFERRAL DESK</h1><Badge className="border border-amber-300/25 bg-amber-300/10 text-amber-100">STAGING ONLY</Badge></div>
              <p className="mt-1 text-sm text-white/55">Private partner enrollment, attribution controls, and manual review — all locked pending legal approval.</p>
            </div>
          </div>
          <Badge className="border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-violet-100">Mode: {status?.mode ?? "staging_locked"}</Badge>
        </div>

        <section className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-50">
          <div className="flex gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><p><strong>Program lock is active.</strong> This candidate neither sends partner emails nor activates links, rewards, payouts, external tracking, or content publication. It only defines the controlled workflow and its admin review surface.</p></div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value, sub, Icon]) => <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Icon className="h-5 w-5 text-cyan-300" /><p className="mt-4 text-3xl font-black">{summaryLoading ? "—" : value}</p><p className="mt-1 font-semibold">{label}</p><p className="mt-1 text-xs text-white/45">{sub}</p></article>)}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-lg font-bold">Provisional partner queue</h2>
            <p className="mt-1 text-sm text-white/50">No partner becomes active from this desk. Legal review, evidence checks, and manual enrollment approval are required.</p>
            <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40"><tr><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Organization</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Link</th></tr></thead>
                <tbody>{partners?.length ? partners.map(partner => <tr key={partner.id} className="border-t border-white/5"><td className="px-4 py-3 font-medium">{partner.name}</td><td className="px-4 py-3 text-white/60">{partner.organization || "—"}</td><td className="px-4 py-3"><Badge variant="outline" className="border-amber-300/30 text-amber-100">{partner.status}</Badge></td><td className="px-4 py-3 text-white/60">{partner.verificationStatus}</td><td className="px-4 py-3 text-white/45">{partner.linkStatus}</td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-white/40">No provisional partners exist. Enrollment is intentionally locked.</td></tr>}</tbody>
              </table>
            </div>
          </article>

          <div className="space-y-6">
          <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Provisional email enrollment</h2><p className="mt-1 text-sm text-white/50">Creates a private invitation only after an approved staging-demo release. It never sends email automatically.</p></div><Badge variant="outline" className="border-amber-300/30 text-amber-100">{programLocked ? "Locked" : "Manual"}</Badge></div>
            <form className="mt-5 grid gap-3" onSubmit={submitInvite}>
              <label className="text-xs font-medium text-white/60">Partner name<input value={invite.name} onChange={event => setInvite({ ...invite, name: event.target.value })} disabled={programLocked} className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50" placeholder="Legal review required" /></label>
              <label className="text-xs font-medium text-white/60">Partner email<input type="email" value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })} disabled={programLocked} className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50" placeholder="No email is sent" /></label>
              <label className="text-xs font-medium text-white/60">Organization (optional)<input value={invite.organization} onChange={event => setInvite({ ...invite, organization: event.target.value })} disabled={programLocked} className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50" placeholder="Podcast, studio, or network" /></label>
              <Button type="submit" disabled={programLocked || inviteMutation.isPending} className="mt-1 bg-violet-600 hover:bg-violet-500 disabled:bg-white/10">{programLocked ? "Enrollment disabled pending legal review" : "Create provisional invitation"}</Button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-lg font-bold">Manual reward review queue</h2>
            <p className="mt-1 text-sm text-white/50">Only legally qualified, rights-cleared referrals may appear here. Approval records a non-payment decision; no settlement path exists.</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[460px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40"><tr><th className="px-3 py-3">Attribution</th><th className="px-3 py-3">Review state</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{reviews?.length ? reviews.map(review => <tr key={review.id} className="border-t border-white/5"><td className="px-3 py-3 text-white/65">#{review.attributionId}</td><td className="px-3 py-3"><Badge variant="outline" className="border-violet-300/30 text-violet-100">{review.status}</Badge></td><td className="px-3 py-3"><Button size="sm" disabled={programLocked || review.status !== "eligible_for_manual_review" || reviewMutation.isPending} onClick={() => reviewMutation.mutate({ reviewId: review.id, decision: "approved_non_payment" })} className="bg-white/10 text-white hover:bg-white/20 disabled:bg-white/5">{programLocked ? "Locked" : "Record non-payment approval"}</Button></td></tr>) : <tr><td colSpan={3} className="px-3 py-8 text-center text-white/40">No reviewable referrals. The program does not create reward actions while locked.</td></tr>}</tbody></table></div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-lg font-bold">Controlled workflow</h2>
            <ol className="mt-4 space-y-4">{statusSteps.map(([number, title, copy]) => <li key={number} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-xs font-bold text-cyan-100">{number}</span><div><p className="font-semibold">{title}</p><p className="mt-0.5 text-sm leading-5 text-white/50">{copy}</p></div></li>)}</ol>
          </article>
          </div>
        </section>
      </div>
    </main>
  );
}
