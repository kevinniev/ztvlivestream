import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { emitQuizAnalyticsEvent } from "@/lib/quizAnalytics";
import { trpc } from "@/lib/trpc";
import type { AnswerOption, PublicQuizQuestion, QuizEventName, QuizMode } from "@shared/quizTypes";
import {
  ArrowRight,
  Award,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Eye,
  Gift,
  LockKeyhole,
  Play,
  Share2,
  Sparkles,
  Trophy,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const optionKeys: AnswerOption[] = ["A", "B", "C", "D"];

type ActiveSession = {
  attemptToken: string;
  mode: QuizMode;
  questionCount: number;
  questionIndex: number;
  question: PublicQuizQuestion;
  score: number;
  correctAnswers: number;
};

type Completion = {
  provisionalRank: number | null;
  entered: boolean;
  totalScore: number;
  correctAnswers: number;
  durationMs: number;
};

function anonymousId() {
  const key = "ztvlive-quiz-anonymous-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function QuizPage() {
  const { user, isAuthenticated } = useAuth();
  const experienceQuery = trpc.quiz.experience.useQuery();
  const recordEvent = trpc.quiz.recordEvent.useMutation();
  const startMutation = trpc.quiz.start.useMutation();
  const answerMutation = trpc.quiz.answer.useMutation();
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const timerWarningRef = useRef<Set<number>>(new Set());
  const initialEventsRef = useRef(false);
  const [visitorId] = useState(() => anonymousId());
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(20);
  const [selectedOption, setSelectedOption] = useState<AnswerOption | null>(null);
  const [feedback, setFeedback] = useState<null | { isCorrect: boolean; text: string }>(null);
  const [notice, setNotice] = useState("Ready when you are.");

  const track = useCallback((eventName: QuizEventName, properties: Record<string, unknown> = {}) => {
    const eventProperties = { ...properties, screen: "daily_quiz" };
    emitQuizAnalyticsEvent(eventName, eventProperties);
    recordEvent.mutate({
      eventName,
      anonymousId: visitorId,
      quizDate: experienceQuery.data?.quiz.date,
      properties: eventProperties,
    });
  }, [experienceQuery.data?.quiz.date, recordEvent, visitorId]);

  useEffect(() => {
    if (!experienceQuery.data || initialEventsRef.current) return;
    initialEventsRef.current = true;
    track("quiz_view", { authenticated: isAuthenticated });
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") === "success") track("sign_up_completed", { origin: "quiz_return" });
    if (params.get("purchase") === "success") track("premium_purchase", { origin: "quiz_return" });
  }, [experienceQuery.data, isAuthenticated, track]);

  useEffect(() => {
    const capturePremiumPurchase = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "ztvlive-premium-purchase") return;
      track("premium_purchase", { origin: "ztvlive_subscribe_confirmation" });
    };
    window.addEventListener("message", capturePremiumPurchase);
    return () => window.removeEventListener("message", capturePremiumPurchase);
  }, [track]);

  useEffect(() => {
    if (!session) return;
    setRemainingSeconds(20);
    setSelectedOption(null);
    setFeedback(null);
    timerWarningRef.current = new Set();
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const next = Math.max(0, 20 - Math.floor((Date.now() - startedAt) / 1000));
      setRemainingSeconds(next);
      if ((next === 10 || next === 5) && !timerWarningRef.current.has(next)) {
        timerWarningRef.current.add(next);
        setNotice(`${next} seconds remaining for this question.`);
      }
      if (next === 0) {
        window.clearInterval(interval);
        setNotice("Time expired. Continue to record this question as unanswered.");
      }
    }, 250);
    window.setTimeout(() => questionHeadingRef.current?.focus(), 30);
    return () => window.clearInterval(interval);
  }, [session?.question.id]);

  const startQuiz = async (preferredMode: QuizMode) => {
    if (preferredMode === "ranked" && !isAuthenticated) {
      track("sign_in_prompt_viewed", { placement: "start_ranked" });
      window.location.assign(getLoginUrl());
      return;
    }
    try {
      const result = await startMutation.mutateAsync({ preferredMode });
      if (!result.question) throw new Error("Today’s question set is not ready yet.");
      setCompletion(null);
      setSession({
        attemptToken: result.attemptToken,
        mode: result.mode,
        questionCount: result.questionCount,
        questionIndex: result.questionIndex,
        question: result.question,
        score: 0,
        correctAnswers: 0,
      });
      setNotice(result.mode === "practice" ? "practice — not prize eligible." : "Prize-eligible quiz session started.");
      track("quiz_start", { mode: result.mode, resumed: result.resumed });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start the quiz.");
    }
  };

  const submitAnswer = async (option: AnswerOption) => {
    if (!session || answerMutation.isPending || feedback) return;
    setSelectedOption(option);
    try {
      const result = await answerMutation.mutateAsync({ attemptToken: session.attemptToken, selectedOption: option });
      const message = result.answer.isCorrect
        ? `Correct. +${result.answer.pointsAwarded} points, including a ${result.answer.speedBonus}-point speed bonus.`
        : result.answer.timedOut
          ? "Time expired. No points awarded."
          : "Not this time. No points awarded.";
      setFeedback({ isCorrect: result.answer.isCorrect, text: message });
      setNotice(message);
      track("quiz_question_answered", {
        question_number: session.questionIndex + 1,
        correct: result.answer.isCorrect,
        timed_out: result.answer.timedOut,
        score: result.answer.score,
      });
      window.setTimeout(() => {
        if (result.completed && result.completion) {
          setCompletion(result.completion);
          setSession(null);
          track("quiz_completed", {
            mode: session.mode,
            score: result.completion.totalScore,
            correct_answers: result.completion.correctAnswers,
            entered: result.completion.entered,
          });
          if (result.completion.entered) track("score_saved", { rank: result.completion.provisionalRank, score: result.completion.totalScore });
          experienceQuery.refetch();
          return;
        }
        const nextQuestion = result.nextQuestion;
        if (nextQuestion) {
          setSelectedOption(null);
          setFeedback(null);
          setNotice("Next question ready.");
          setSession(current => current ? {
            ...current,
            questionIndex: current.questionIndex + 1,
            question: nextQuestion,
            score: result.answer.score,
            correctAnswers: result.answer.correctAnswers,
          } : null);
        }
      }, 900);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to validate that answer.");
    }
  };

  const shareResult = async () => {
    if (!completion) return;
    const text = `I scored ${completion.totalScore} points on today’s ZTVLIVE Daily Quiz. Can you top the board?`;
    try {
      if (navigator.share) await navigator.share({ title: "ZTVLIVE Daily Quiz", text, url: window.location.href });
      else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      toast.success("Your ZTVLIVE quiz result is ready to share.");
    } catch {
      // Closing the native share sheet is not an error worth interrupting the player for.
    }
  };

  const data = experienceQuery.data;
  const categoryLabel = session?.question.category === "communitycut" ? "CommunityCut" : session?.question.category === "ztvlive" ? "ZTVLIVE" : session?.question.category;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#060812] text-white selection:bg-cyan-300 selection:text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(29,217,255,0.17),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(146,96,255,0.20),transparent_26%),linear-gradient(180deg,#070b18_0%,#060812_46%,#0a0b17_100%)]" />
      <header className="relative border-b border-white/10 bg-[#070a14]/85 backdrop-blur-xl">
        <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
          <a href="https://ztvlivestream.com" className="group flex items-center gap-3" aria-label="Return to ZTVLIVE home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-violet-500 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.30)]">Z</span>
            <span className="leading-none"><strong className="block tracking-[0.18em] text-white">ZTVLIVE</strong><small className="mt-1 block text-[10px] font-semibold tracking-[0.2em] text-cyan-200/70">DAILY QUIZ</small></span>
          </a>
          <div className="hidden items-center gap-2 text-xs text-slate-300 sm:flex"><Eye className="h-4 w-4 text-cyan-300" /><span>Live TV audience</span><span className="rounded-full bg-white/8 px-2 py-1 text-slate-400">not quiz traffic</span></div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? <span className="hidden text-sm text-slate-300 sm:block">Hi, {user?.name?.split(" ")[0] || "player"}</span> : null}
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => { if (isAuthenticated) window.location.assign("/watchlist"); else { track("sign_in_prompt_viewed", { placement: "header" }); window.location.assign(getLoginUrl()); } }}>
              {isAuthenticated ? "Account" : "Sign in"}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container pb-20 pt-8 sm:pt-12">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold tracking-wide text-cyan-100">{data?.quiz.themeLabel ?? "Loading today’s theme"}</span>
              <span className="text-sm text-slate-300">{data?.quiz.questionCount ?? 20} questions · 20 seconds each · ends {data?.quiz.cutoffLabel ?? "at Arizona MST cutoff"}</span>
            </div>

            {!session && !completion ? (
              <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c1020]/90 p-6 shadow-2xl shadow-black/35 sm:p-10">
                <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative max-w-2xl">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20"><Trophy className="h-7 w-7" /></div>
                  <p className="text-sm font-bold uppercase tracking-[0.23em] text-cyan-200">Play. learn. represent.</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-6xl">Today’s <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-300">Daily Quiz.</span></h1>
                  <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">A fast, culture-forward quiz built around ZTVLIVE, CommunityCut, creators, and the conversations moving the community.</p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {["$50 top score", "$25 second place", "$10 third place"].map((prize, index) => <div key={prize} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Gift className={`mb-3 h-5 w-5 ${index === 0 ? "text-amber-300" : "text-cyan-200"}`} /><p className="font-bold text-white">{prize}</p><p className="mt-1 text-xs leading-5 text-slate-400">Verified daily entry</p></div>)}
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {data?.eligibility.canStartRanked ? <Button size="lg" onClick={() => startQuiz("ranked")} className="bg-gradient-to-r from-cyan-300 to-sky-400 font-black text-slate-950 hover:from-cyan-200 hover:to-sky-300"><Play className="mr-2 h-4 w-4 fill-current" />Start prize-eligible quiz</Button> : <Button size="lg" onClick={() => isAuthenticated ? startQuiz("practice") : startQuiz("ranked")} className="bg-gradient-to-r from-cyan-300 to-sky-400 font-black text-slate-950 hover:from-cyan-200 hover:to-sky-300"><Play className="mr-2 h-4 w-4 fill-current" />{isAuthenticated ? "Play practice mode" : "Sign in for prize entry"}</Button>}
                    <Button size="lg" variant="outline" onClick={() => startQuiz("practice")} className="border-white/15 bg-white/5 text-white hover:bg-white/10">Play practice</Button>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">{data?.eligibility.explanation ?? "Loading eligibility."} Practice replay is always available.</p>
                </div>
              </section>
            ) : null}

            {session ? (
              <section className="rounded-[2rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-2xl shadow-black/30 sm:p-8" aria-describedby="quiz-notice">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">{session.mode === "practice" ? "practice — not prize eligible." : "Verified daily entry"}</p><p className="mt-1 text-sm text-slate-400">Question {session.questionIndex + 1} of {session.questionCount} · {categoryLabel}</p></div>
                  <div className={`flex items-center gap-2 rounded-full border px-4 py-2 font-black ${remainingSeconds <= 5 ? "border-rose-400/60 bg-rose-400/10 text-rose-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}><Clock3 className="h-4 w-4" /><span role="timer" aria-label={`${remainingSeconds} seconds remaining`}>{remainingSeconds}s</span></div>
                </div>
                <div className="mb-7 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className={`h-full rounded-full transition-[width] duration-200 ${remainingSeconds <= 5 ? "bg-rose-400" : "bg-gradient-to-r from-cyan-300 to-violet-400"}`} style={{ width: `${remainingSeconds * 5}%` }} /></div>
                <p id="quiz-notice" className="sr-only" aria-live="assertive">{notice}</p>
                <h2 ref={questionHeadingRef} tabIndex={-1} className="max-w-3xl text-2xl font-bold leading-tight text-white outline-none sm:text-4xl">{session.question.prompt}</h2>
                <div className="mt-8 grid gap-3 sm:grid-cols-2" role="group" aria-label="Answer choices">
                  {session.question.options.map((option, index) => {
                    const key = optionKeys[index];
                    const isSelected = selectedOption === key;
                    const isCorrectFeedback = feedback && isSelected && feedback.isCorrect;
                    const isWrongFeedback = feedback && isSelected && !feedback.isCorrect;
                    return <button key={key} disabled={answerMutation.isPending || Boolean(feedback)} onClick={() => submitAnswer(key)} aria-pressed={isSelected} aria-label={`Answer ${key}: ${option}${isSelected && feedback ? feedback.isCorrect ? ", correct" : ", incorrect" : ""}`} className={`group flex min-h-20 items-center gap-4 rounded-2xl border p-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70 disabled:cursor-not-allowed ${isCorrectFeedback ? "border-emerald-300/70 bg-emerald-400/15" : isWrongFeedback ? "border-rose-400/70 bg-rose-400/15" : isSelected ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-white/[0.035] hover:border-cyan-200/50 hover:bg-white/[0.07]"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-black text-cyan-100 group-hover:bg-cyan-300 group-hover:text-slate-950">{key}</span><span className="font-semibold text-slate-100">{option}</span>{isCorrectFeedback ? <Check className="ml-auto h-5 w-5 text-emerald-300" /> : isWrongFeedback ? <X className="ml-auto h-5 w-5 text-rose-300" /> : null}</button>;
                  })}
                </div>
                {remainingSeconds === 0 && !feedback ? <button onClick={() => submitAnswer("A")} className="mt-5 text-sm font-bold text-cyan-200 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Continue after time expired</button> : null}
                {feedback ? <div className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 ${feedback.isCorrect ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" : "border-rose-300/30 bg-rose-400/10 text-rose-100"}`} role="status"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">{feedback.isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}</span><span className="font-semibold">{feedback.text}</span></div> : null}
                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-sm text-slate-400"><span>Server score <strong className="ml-1 text-cyan-200">{session.score}</strong></span><span>{session.correctAnswers} correct so far</span></div>
              </section>
            ) : null}

            {completion ? (
              <section className="overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-[#0b1020]/95 shadow-2xl shadow-black/30">
                <div className="relative p-7 sm:p-10"><div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" /><div className="relative"><div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-400 text-slate-950"><Award className="h-7 w-7" /></div><p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">Quiz complete</p><h2 className="mt-2 text-4xl font-black text-white">You showed up.</h2><p className="mt-3 max-w-xl text-lg text-slate-300">You scored <strong className="text-cyan-200">{completion.totalScore} points</strong> with {completion.correctAnswers} correct answers in {formatDuration(completion.durationMs)}.</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Score</p><p className="mt-1 text-3xl font-black text-white">{completion.totalScore}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Accuracy</p><p className="mt-1 text-3xl font-black text-white">{completion.correctAnswers}/{data?.quiz.questionCount ?? 20}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Provisional rank</p><p className="mt-1 text-3xl font-black text-white">{completion.provisionalRank ? `#${completion.provisionalRank}` : "—"}</p></div></div>
                  <div className={`mt-6 rounded-2xl border p-5 ${completion.entered ? "border-emerald-300/30 bg-emerald-400/10" : "border-white/10 bg-white/[0.04]"}`}><div className="flex gap-3"><Check className={`mt-0.5 h-5 w-5 shrink-0 ${completion.entered ? "text-emerald-300" : "text-slate-400"}`} /><div><p className="font-bold text-white">{completion.entered ? "You are entered." : "Practice result saved locally."}</p><p className="mt-1 text-sm leading-6 text-slate-300">{completion.entered ? "Your verified score is awaiting the daily review process. Winner notifications are sent after review." : "practice — not prize eligible. Sign in before a future daily cutoff to use your verified entry."}</p></div></div></div>
                  <div className="mt-6 flex flex-wrap gap-3"><Button onClick={shareResult} className="bg-white text-slate-950 hover:bg-cyan-100"><Share2 className="mr-2 h-4 w-4" />Share score card</Button><Button variant="outline" onClick={() => startQuiz("practice")} className="border-white/15 bg-white/5 text-white hover:bg-white/10">Play practice</Button></div>
                </div></div>
                <div className="grid border-t border-white/10 lg:grid-cols-2"><a href="/shows/communitycut-weekly" className="group border-b border-white/10 p-6 transition hover:bg-white/[0.035] lg:border-b-0 lg:border-r"><p className="text-xs font-bold uppercase tracking-[0.17em] text-cyan-200">Next on ZTVLIVE</p><h3 className="mt-2 text-xl font-bold text-white">CommunityCut Weekly: The Money Is In The Movement</h3><p className="mt-2 text-sm leading-6 text-slate-400">Watch the latest conversation on visibility, creativity, and building community.</p><span className="mt-4 inline-flex items-center text-sm font-bold text-cyan-200">Watch episode <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span></a><button onClick={() => { track("premium_cta_clicked", { placement: "completion_locked_question" }); window.location.assign("/subscribe?return_to=quiz"); }} className="group p-6 text-left transition hover:bg-white/[0.035]"><div className="flex items-center gap-2 text-violet-200"><LockKeyhole className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.17em]">ZTVLIVE+ example</span></div><h3 className="mt-3 text-xl font-bold text-white">Locked bonus question</h3><p className="mt-2 text-sm leading-6 text-slate-300">“What preparation helps a CommunityCut creator spotlight feel polished on camera?”</p><span className="mt-4 inline-flex items-center text-sm font-bold text-violet-200">Explore ZTVLIVE+ benefits <Crown className="ml-2 h-4 w-4" /></span></button></div>
              </section>
            ) : null}

            <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8" aria-labelledby="rules-heading"><div className="flex items-center gap-3"><Volume2 className="h-5 w-5 text-amber-300" /><h2 id="rules-heading" className="text-xl font-bold text-white">Daily prize rules</h2></div><div className="mt-5 grid gap-5 text-sm leading-6 text-slate-300 md:grid-cols-2"><p><strong className="text-white">Eligibility.</strong> Draft rules apply to verified ZTVLIVE account holders who are 18+ and lawful residents of the United States, except where prohibited. No purchase is necessary to enter or win, and a purchase does not improve odds of winning.</p><p><strong className="text-white">Cutoff and selection.</strong> The prize window closes at <strong className="text-cyan-200">11:59 PM Arizona MST</strong>. Winners are ranked by highest server-validated score, then shortest server-measured completion time, then earliest verified completion time.</p><p><strong className="text-white">Verification.</strong> Potential winners must pass account, eligibility, and one-attempt review before publication. Verification staff may disqualify entries that do not meet the rules.</p><p><strong className="text-white">Notification.</strong> Verified potential winners are contacted within 48 hours after the Arizona MST cutoff. Draft rules require legal approval before public prize promotion.</p></div></section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#0c1020]/85 p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-300" /><h2 className="font-bold text-white">Today’s board</h2></div><span className="text-xs text-slate-500">Provisional</span></div><div className="mt-5 space-y-3">{data?.leaderboard.length ? data.leaderboard.map(entry => <div key={`${entry.rank}-${entry.displayName}`} className="flex items-center gap-3 rounded-xl bg-white/[0.045] px-3 py-3"><span className="w-5 text-center text-sm font-black text-cyan-200">{entry.rank}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">{entry.displayName}</span><span className="text-sm font-black text-white">{entry.score}</span></div>) : <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm leading-6 text-slate-300">Today's board opens after the first verified score. Winners are posted after review.</p>}</div></section>
            <section className="rounded-3xl border border-white/10 bg-[#0c1020]/85 p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-200" /><h2 className="font-bold text-white">Previous winners</h2></div><div className="mt-4 space-y-3">{data?.winners.length ? data.winners.map(winner => <div key={`${winner.quizDate}-${winner.prizeTier}`} className="flex items-center justify-between text-sm"><span className="text-slate-200">{winner.displayName}</span><span className="text-xs font-bold capitalize text-amber-200">{winner.prizeTier}</span></div>) : <p className="text-sm leading-6 text-slate-400">Verified winners will appear here once daily reviews are complete.</p>}</div></section>
            <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-500/15 to-cyan-400/10 p-5"><Zap className="h-5 w-5 text-cyan-200" /><h2 className="mt-3 text-lg font-black text-white">ZTVLIVE+ Quiz Mode</h2><p className="mt-2 text-sm leading-6 text-slate-300">Explore exclusive question sets, bonus rounds, and more ways to support independent creators.</p><Button variant="outline" onClick={() => { track("premium_cta_clicked", { placement: "sidebar" }); window.location.assign("/subscribe?return_to=quiz"); }} className="mt-4 w-full border-violet-200/35 bg-white/10 text-white hover:bg-white/15">Explore ZTVLIVE+ <ChevronRight className="ml-1 h-4 w-4" /></Button></section>
          </aside>
        </section>
      </main>
    </div>
  );
}
