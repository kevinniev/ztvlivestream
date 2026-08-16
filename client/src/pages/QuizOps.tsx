import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, Crown, LockKeyhole, Trophy, Users } from "lucide-react";
import { useState } from "react";

const periods = [7, 28, 90] as const;

export default function QuizOps() {
  const { user, loading } = useAuth();
  const [days, setDays] = useState<(typeof periods)[number]>(7);
  const enabled = user?.role === "admin";
  const analytics = trpc.quiz.analytics.useQuery({ days }, { enabled });
  const candidates = trpc.quiz.winnerCandidates.useQuery(undefined, { enabled });
  const reviewQueue = trpc.quiz.winnerReviewQueue.useQuery(undefined, { enabled });
  const queueReview = trpc.quiz.queueWinnerReview.useMutation({ onSuccess: () => { candidates.refetch(); reviewQueue.refetch(); } });
  const updateStatus = trpc.quiz.updateWinnerStatus.useMutation({ onSuccess: () => reviewQueue.refetch() });

  if (!loading && !enabled) return <section className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-6 text-center"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"><LockKeyhole className="mx-auto h-7 w-7 text-rose-200" /><h1 className="mt-4 text-2xl font-black text-white">Operations access required</h1><p className="mt-3 text-sm leading-6 text-white/60">Quiz performance and winner-review data are available only to ZTVLIVE administrators.</p></div></section>;

  const funnel = analytics.data?.funnel;
  const cards = [
    { label: "Quiz views", value: funnel?.views ?? 0, icon: Users },
    { label: "Started", value: funnel?.starts ?? 0, icon: Trophy },
    { label: "Completed", value: funnel?.completions ?? 0, icon: CheckCircle2 },
    { label: "Premium purchases", value: funnel?.premiumPurchases ?? 0, icon: Crown },
  ];
  return <section className="min-h-screen bg-[#060812] px-4 py-10 text-white sm:px-8"><div className="mx-auto max-w-6xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">ZTVLIVE operations</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-black">Secure Quiz Control Room</h1><p className="mt-2 text-sm text-white/55">First-party daily quiz funnel, candidate ranking, and winner verification.</p></div><div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">{periods.map(period => <Button key={period} size="sm" onClick={() => setDays(period)} className={days === period ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "bg-transparent text-slate-300 hover:bg-white/10"}>{period}d</Button>)}</div></div>
  <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <article key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><card.icon className="h-5 w-5 text-cyan-200" /><p className="mt-5 text-sm text-white/55">{card.label}</p><p className="mt-1 text-3xl font-black">{card.value}</p></article>)}</div>
  <div className="mt-6 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><BarChart3 className="h-5 w-5 text-violet-200" /><p className="mt-4 text-sm text-white/55">Completion rate</p><p className="mt-1 text-3xl font-black">{analytics.data?.completionRate ?? 0}%</p></article><article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><CheckCircle2 className="h-5 w-5 text-emerald-200" /><p className="mt-4 text-sm text-white/55">Score-save rate</p><p className="mt-1 text-3xl font-black">{analytics.data?.scoreSaveRate ?? 0}%</p></article><article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><Crown className="h-5 w-5 text-amber-200" /><p className="mt-4 text-sm text-white/55">Premium clicks</p><p className="mt-1 text-3xl font-black">{funnel?.premiumClicks ?? 0}</p></article></div>
  <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h2 className="font-bold">Tracked events</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(analytics.data?.counts ?? {}).map(([event, count]) => <div key={event} className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3"><code className="text-xs text-cyan-200">{event}</code><span className="font-black">{count}</span></div>)}</div></section>
  <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold">Winner review</h2><p className="mt-1 text-sm text-white/55">Rank by server score, then duration, then earliest verified completion. Notify verified potential winners within 48 hours after the Arizona MST cutoff.</p></div><Button onClick={() => queueReview.mutate()} disabled={queueReview.isPending} className="bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200">Queue today’s review</Button></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{candidates.data?.candidates.map(candidate => <div key={candidate.scoreId} className="rounded-xl bg-black/20 p-4"><p className="font-black text-cyan-200">{candidate.prizeTier} place</p><p className="mt-2 font-bold">{candidate.displayName}</p><p className="mt-1 text-sm text-white/55">{candidate.score} points · {Math.round(candidate.durationMs / 1000)}s</p></div>) ?? <p className="text-sm text-white/55">No verified score candidates yet.</p>}</div><div className="mt-5 space-y-3">{reviewQueue.data?.queue.map(winner => <div key={winner.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-4"><div><p className="font-bold">{winner.displayName} · <span className="capitalize">{winner.prizeTier}</span></p><p className="mt-1 text-sm text-white/55">{winner.score} points · {Math.round(winner.durationMs / 1000)}s · {winner.status.replaceAll("_", " ")}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ winnerId: winner.id, status: "verified" })}>Verify</Button><Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ winnerId: winner.id, status: "notified" })}>Notify</Button><Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ winnerId: winner.id, status: "awarded" })}>Award</Button><Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ winnerId: winner.id, status: "disqualified" })}>Disqualify</Button></div></div>)}</div></section></div></section>;
}
