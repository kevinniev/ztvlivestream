import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { toast } from "sonner";
import {
  Trophy, Play, RotateCcw, Crown, Medal, Zap,
  CheckCircle, XCircle, Clock, Star, Flame, ArrowRight
} from "lucide-react";

const QUESTION_TIME = 20;

type GameState = "idle" | "playing" | "finished";

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  pointValue: number;
  difficulty: string;
}

const DIFF_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  easy:   { bg: "oklch(0.65 0.22 150/0.15)", text: "oklch(0.65 0.22 150)", label: "Easy" },
  medium: { bg: "oklch(0.78 0.18 60/0.15)",  text: "oklch(0.78 0.18 60)",  label: "Medium" },
  hard:   { bg: "oklch(0.6 0.22 25/0.15)",   text: "oklch(0.6 0.22 25)",   label: "Hard" },
};

export default function Quiz() {
  const { isAuthenticated } = useAuth();
  const [gameState, setGameState] = useState<GameState>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: questionsData, refetch: refetchQuestions } = trpc.quiz.questions.useQuery(
    { limit: 10 }, { enabled: false }
  );
  const { data: leaderboard } = trpc.quiz.leaderboard.useQuery({ limit: 10 });
  const { data: myScores } = trpc.quiz.myScores.useQuery(undefined, { enabled: isAuthenticated });

  const submitScore = trpc.quiz.submitScore.useMutation({
    onSuccess: () => toast.success("Score saved to leaderboard!"),
  });

  const startGame = async () => {
    const result = await refetchQuestions();
    if (result.data && result.data.length > 0) {
      setQuestions(result.data as Question[]);
      setCurrentIndex(0);
      setScore(0);
      setCorrectCount(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setTimeLeft(QUESTION_TIME);
      setGameState("playing");
    }
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    if (gameState !== "playing" || answered) return;
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { stopTimer(); handleAnswer(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
  }, [currentIndex, gameState, answered]);

  const handleAnswer = (answer: string | null) => {
    if (answered) return;
    stopTimer();
    setAnswered(true);
    setSelectedAnswer(answer);
    const q = questions[currentIndex];
    if (!q) return;
    if (answer === q.correctAnswer) {
      const timeBonus = Math.floor((timeLeft / QUESTION_TIME) * 50);
      setScore((s) => s + q.pointValue + timeBonus);
      setCorrectCount((c) => c + 1);
    }
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        finishGame();
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setAnswered(false);
        setTimeLeft(QUESTION_TIME);
      }
    }, 1500);
  };

  const finishGame = () => {
    setGameState("finished");
    if (isAuthenticated) {
      submitScore.mutate({ score, questionsAnswered: questions.length, correctAnswers: correctCount });
    }
  };

  const currentQuestion = questions[currentIndex];
  const options = currentQuestion ? [
    { key: "A", text: currentQuestion.optionA },
    { key: "B", text: currentQuestion.optionB },
    { key: "C", text: currentQuestion.optionC },
    { key: "D", text: currentQuestion.optionD },
  ] : [];

  const getOptionStyle = (key: string) => {
    if (!answered) return "bg-white/5 border-white/10 hover:bg-white/10 hover:border-[oklch(0.74_0.21_218/0.4)] text-white cursor-pointer";
    if (key === currentQuestion?.correctAnswer) return "bg-[oklch(0.65_0.22_150/0.15)] border-[oklch(0.65_0.22_150/0.6)] text-white";
    if (key === selectedAnswer && key !== currentQuestion?.correctAnswer) return "bg-[oklch(0.6_0.22_25/0.15)] border-[oklch(0.6_0.22_25/0.6)] text-white";
    return "bg-white/3 border-white/5 text-white/30";
  };

  const timerPct = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 10 ? "oklch(0.74 0.21 218)" : timeLeft > 5 ? "oklch(0.78 0.18 60)" : "oklch(0.65 0.22 25)";

  const schemas = [breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Quiz Game", url: "/quiz" }])];

  return (
    <>
      <SEO
        title="Quiz Game — Play Trivia & Win Prizes on ZTVLIVE"
        description="Play ZTVLIVE's daily trivia quiz. Answer timed questions, climb the leaderboard, and win real prizes. Free to play, premium mode available."
        url="/quiz"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* ── HEADER STRIP ──────────────────────────── */}
        <div className="bg-gradient-to-r from-[oklch(0.74_0.21_218/0.08)] via-[oklch(0.56_0.24_290/0.05)] to-transparent border-b border-white/6">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] flex items-center justify-center shadow-lg shadow-[oklch(0.74_0.21_218/0.3)]">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">Daily Quiz</h1>
                <p className="text-xs text-white/40">10 questions · {QUESTION_TIME}s each · Daily prizes</p>
              </div>
            </div>
            {gameState === "playing" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/6 border border-white/10">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-sm font-black text-white">{score}</span>
                <span className="text-xs text-white/40">pts</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── MAIN GAME AREA ────────────────────── */}
            <div className="lg:col-span-2">

              {/* IDLE STATE */}
              {gameState === "idle" && (
                <div className="text-center py-10">
                  {/* Glowing trophy */}
                  <div className="relative inline-flex mb-8">
                    <div className="absolute inset-0 rounded-full bg-[oklch(0.74_0.21_218/0.2)] blur-2xl scale-150" />
                    <div className="relative w-28 h-28 rounded-full
                      bg-gradient-to-br from-[oklch(0.74_0.21_218/0.2)] to-[oklch(0.56_0.24_290/0.2)]
                      border border-[oklch(0.74_0.21_218/0.3)]
                      flex items-center justify-center">
                      <Trophy className="w-14 h-14 text-[oklch(0.74_0.21_218)]" />
                    </div>
                  </div>

                  <h2 className="text-4xl font-black text-white mb-3">Daily Trivia Quiz</h2>
                  <p className="text-white/50 mb-6 max-w-md mx-auto">
                    10 timed questions. Answer fast for bonus points. Top scores win real prizes every day!
                  </p>

                  <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
                    {[
                      { icon: Clock, label: `${QUESTION_TIME}s per question` },
                      { icon: Zap,   label: "Speed bonuses" },
                      { icon: Star,  label: "Daily prizes" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5 text-sm text-white/40">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {/* Prize podium */}
                  <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-8">
                    {[
                      { place: "1st", prize: "$50 Gift Card", color: "oklch(0.78 0.18 60)", emoji: "🥇" },
                      { place: "2nd", prize: "$25 Gift Card", color: "oklch(0.65 0.1 264)",  emoji: "🥈" },
                      { place: "3rd", prize: "$10 Gift Card", color: "oklch(0.65 0.15 40)",  emoji: "🥉" },
                    ].map((p) => (
                      <div key={p.place}
                        className="glass-card rounded-xl p-3 text-center"
                        style={{ borderColor: `${p.color}30` }}>
                        <div className="text-2xl mb-1">{p.emoji}</div>
                        <p className="text-xs font-black" style={{ color: p.color }}>{p.place}</p>
                        <p className="text-[10px] text-white/45 mt-0.5">{p.prize}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={startGame}
                    className="flex items-center gap-2 px-10 py-3.5 rounded-xl mx-auto
                      bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)]
                      text-white font-black text-base hover:opacity-90 active:scale-95 transition-all
                      shadow-xl shadow-[oklch(0.74_0.21_218/0.3)]">
                    <Play className="w-5 h-5 fill-white" />
                    Start Quiz
                  </button>

                  {!isAuthenticated && (
                    <p className="text-xs text-white/30 mt-4">
                      <button onClick={() => (window.location.href = getLoginUrl())}
                        className="text-[oklch(0.74_0.21_218)] hover:underline font-semibold">
                        Sign in
                      </button>{" "}
                      to save your score to the leaderboard
                    </p>
                  )}
                </div>
              )}

              {/* PLAYING STATE */}
              {gameState === "playing" && currentQuestion && (
                <div>
                  {/* Progress header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-white/45">
                      Question <span className="font-black text-white">{currentIndex + 1}</span> / {questions.length}
                    </span>
                    <div className={`flex items-center gap-1.5 text-sm font-black transition-colors ${
                      timeLeft <= 5 ? "text-[oklch(0.65_0.22_25)]" : timeLeft <= 10 ? "text-[oklch(0.78_0.18_60)]" : "text-white"
                    }`}>
                      <Clock className="w-4 h-4" />
                      {timeLeft}s
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/8 rounded-full mb-5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentIndex) / questions.length) * 100}%`,
                        background: "linear-gradient(to right, oklch(0.74 0.21 218), oklch(0.56 0.24 290))"
                      }} />
                  </div>

                  {/* Timer bar */}
                  <div className="w-full h-1 bg-white/8 rounded-full mb-6 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${timerPct}%`, background: timerColor }} />
                  </div>

                  {/* Difficulty badge */}
                  <div className="flex items-center gap-2 mb-4">
                    {(() => {
                      const d = DIFF_STYLE[currentQuestion.difficulty] ?? DIFF_STYLE.medium!;
                      return (
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                          style={{ background: d.bg, color: d.text }}>
                          {d.label}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-white/30 font-semibold">{currentQuestion.pointValue} pts base</span>
                    <span className="text-xs text-[oklch(0.74_0.21_218)] font-semibold ml-auto">+{Math.floor((timeLeft / QUESTION_TIME) * 50)} speed bonus</span>
                  </div>

                  {/* Question card */}
                  <div className="relative overflow-hidden rounded-2xl p-6 mb-5
                    bg-gradient-to-br from-[oklch(0.74_0.21_218/0.06)] to-[oklch(0.56_0.24_290/0.04)]
                    border border-[oklch(0.74_0.21_218/0.2)]">
                    <p className="text-lg font-bold text-white leading-relaxed">
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {options.map((opt) => (
                      <button key={opt.key}
                        onClick={() => handleAnswer(opt.key)}
                        disabled={answered}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150 active:scale-98 ${getOptionStyle(opt.key)}`}>
                        <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black shrink-0">
                          {opt.key}
                        </span>
                        <span className="text-sm flex-1">{opt.text}</span>
                        {answered && opt.key === currentQuestion.correctAnswer && (
                          <CheckCircle className="w-4 h-4 text-[oklch(0.65_0.22_150)] shrink-0" />
                        )}
                        {answered && opt.key === selectedAnswer && opt.key !== currentQuestion.correctAnswer && (
                          <XCircle className="w-4 h-4 text-[oklch(0.6_0.22_25)] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FINISHED STATE */}
              {gameState === "finished" && (
                <div className="text-center py-8">
                  {/* Result glow */}
                  <div className="relative inline-flex mb-6">
                    <div className="absolute inset-0 rounded-full bg-[oklch(0.78_0.18_60/0.2)] blur-2xl scale-150" />
                    <div className="relative w-28 h-28 rounded-full
                      bg-gradient-to-br from-[oklch(0.78_0.18_60/0.2)] to-[oklch(0.74_0.21_218/0.2)]
                      border border-[oklch(0.78_0.18_60/0.4)]
                      flex items-center justify-center">
                      <Trophy className="w-14 h-14 text-[oklch(0.78_0.18_60)]" />
                    </div>
                  </div>

                  <h2 className="text-3xl font-black text-white mb-2">Quiz Complete!</h2>
                  <p className="text-white/45 mb-8">
                    {correctCount} of {questions.length} correct · {Math.round((correctCount / questions.length) * 100)}% accuracy
                  </p>

                  {/* Score cards */}
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                    <div className="glass-card rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-[oklch(0.74_0.21_218)]">{score}</p>
                      <p className="text-xs text-white/40 mt-1">Total Score</p>
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-[oklch(0.65_0.22_150)]">{correctCount}</p>
                      <p className="text-xs text-white/40 mt-1">Correct</p>
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-white">{Math.round((correctCount / questions.length) * 100)}%</p>
                      <p className="text-xs text-white/40 mt-1">Accuracy</p>
                    </div>
                  </div>

                  {!isAuthenticated && (
                    <div className="glass-card rounded-xl p-5 mb-6 max-w-sm mx-auto border-[oklch(0.74_0.21_218/0.3)]">
                      <Crown className="w-6 h-6 text-[oklch(0.74_0.21_218)] mx-auto mb-2" />
                      <p className="text-sm text-white/65 mb-3">Sign in to save your score and compete on the leaderboard!</p>
                      <button onClick={() => (window.location.href = getLoginUrl())}
                        className="w-full py-2.5 rounded-xl bg-[oklch(0.74_0.21_218)] text-[oklch(0.06_0.012_264)] font-black text-sm hover:opacity-90 transition-opacity">
                        Sign In to Save Score
                      </button>
                    </div>
                  )}

                  <button onClick={startGame}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl mx-auto
                      bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)]
                      text-white font-black hover:opacity-90 active:scale-95 transition-all">
                    <RotateCcw className="w-4 h-4" />
                    Play Again
                  </button>
                </div>
              )}
            </div>

            {/* ── SIDEBAR ───────────────────────────── */}
            <div className="space-y-5">
              {/* Leaderboard */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[oklch(0.78_0.18_60)]" />
                  <h3 className="text-sm font-black text-white">Leaderboard</h3>
                  <span className="ml-auto text-xs text-white/30">Today</span>
                </div>
                <div className="divide-y divide-white/5">
                  {leaderboard?.map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                      <div className="w-6 text-center shrink-0">
                        {i === 0 ? <span className="text-base">🥇</span>
                          : i === 1 ? <span className="text-base">🥈</span>
                          : i === 2 ? <span className="text-base">🥉</span>
                          : <span className="text-xs text-white/30 font-black">{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{entry.userName ?? "Anonymous"}</p>
                        <p className="text-xs text-white/30">{entry.correctAnswers}/{entry.questionsAnswered} correct</p>
                      </div>
                      <span className="text-sm font-black text-[oklch(0.74_0.21_218)]">
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {(!leaderboard || leaderboard.length === 0) && (
                    <div className="px-4 py-8 text-center text-white/25 text-sm">
                      No scores yet. Be the first!
                    </div>
                  )}
                </div>
              </div>

              {/* My scores */}
              {isAuthenticated && myScores && myScores.length > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                    <Medal className="w-4 h-4 text-[oklch(0.65_0.25_290)]" />
                    <h3 className="text-sm font-black text-white">My Recent Scores</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {myScores.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-black text-[oklch(0.74_0.21_218)]">{s.score.toLocaleString()}</p>
                          <p className="text-xs text-white/30">
                            {s.correctAnswers}/{s.questionsAnswered} · {new Date(s.playedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ZTVLIVE+ promo */}
              <div className="relative overflow-hidden rounded-2xl p-5 text-center
                bg-gradient-to-br from-[oklch(0.74_0.21_218/0.1)] to-[oklch(0.56_0.24_290/0.08)]
                border border-[oklch(0.74_0.21_218/0.25)]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[oklch(0.74_0.21_218/0.08)] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                <Crown className="w-7 h-7 text-[oklch(0.74_0.21_218)] mx-auto mb-2" />
                <p className="text-sm font-black text-white mb-1">ZTVLIVE+ Premium Quiz</p>
                <p className="text-xs text-white/50 mb-4 leading-relaxed">
                  Exclusive questions, double points, and bonus prize entries every day
                </p>
                <Link href="/subscribe">
                  <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] text-white font-black text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                    Upgrade Now
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
