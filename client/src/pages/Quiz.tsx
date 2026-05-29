import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trophy,
  Play,
  RotateCcw,
  Crown,
  Medal,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Star,
} from "lucide-react";

const QUESTION_TIME = 20; // seconds

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

export default function Quiz() {
  const { isAuthenticated, user } = useAuth();
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
    { limit: 10 },
    { enabled: false }
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (gameState !== "playing" || answered) return;
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          handleAnswer(null);
          return 0;
        }
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
      const points = q.pointValue + timeBonus;
      setScore((s) => s + points);
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
      submitScore.mutate({
        score,
        questionsAnswered: questions.length,
        correctAnswers: correctCount,
      });
    }
  };

  const currentQuestion = questions[currentIndex];
  const options = currentQuestion
    ? [
        { key: "A", text: currentQuestion.optionA },
        { key: "B", text: currentQuestion.optionB },
        { key: "C", text: currentQuestion.optionC },
        { key: "D", text: currentQuestion.optionD },
      ]
    : [];

  const getOptionStyle = (key: string) => {
    if (!answered) return "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white";
    if (key === currentQuestion?.correctAnswer) return "bg-[oklch(0.65_0.22_150/0.2)] border-[oklch(0.65_0.22_150)] text-white";
    if (key === selectedAnswer && key !== currentQuestion?.correctAnswer) return "bg-[oklch(0.6_0.22_25/0.2)] border-[oklch(0.6_0.22_25)] text-white";
    return "bg-white/5 border-white/5 text-white/30";
  };

  const schemas = [breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Quiz Game", url: "/quiz" }])];

  return (
    <>
      <SEO
        title="Quiz Game — Play Trivia & Win Prizes"
        description="Play ZTVLIVE's daily trivia quiz. Answer timed questions, climb the leaderboard, and win real prizes. Free to play, premium mode available."
        url="/quiz"
        schema={schemas}
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main game area */}
          <div className="lg:col-span-2">
            {gameState === "idle" && (
              <div className="text-center py-16">
                <div className="w-24 h-24 rounded-full bg-[oklch(0.72_0.2_220/0.15)] flex items-center justify-center mx-auto mb-6 border border-[oklch(0.72_0.2_220/0.3)]">
                  <Trophy className="w-12 h-12 text-[oklch(0.72_0.2_220)]" />
                </div>
                <h1 className="text-4xl font-black text-white mb-3">Daily Quiz</h1>
                <p className="text-white/50 text-sm mb-2 max-w-md mx-auto">
                  10 timed trivia questions. Answer fast for bonus points. Top scores win prizes!
                </p>
                <div className="flex items-center justify-center gap-6 mb-8 text-sm">
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Clock className="w-4 h-4" />
                    {QUESTION_TIME}s per question
                  </div>
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Zap className="w-4 h-4" />
                    Speed bonuses
                  </div>
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Star className="w-4 h-4" />
                    Daily prizes
                  </div>
                </div>

                {/* Prize display */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
                  {[
                    { place: "1st", prize: "$50 Gift Card", color: "oklch(0.75 0.18 60)", icon: "🥇" },
                    { place: "2nd", prize: "$25 Gift Card", color: "oklch(0.65 0.1 264)", icon: "🥈" },
                    { place: "3rd", prize: "$10 Gift Card", color: "oklch(0.65 0.15 40)", icon: "🥉" },
                  ].map((p) => (
                    <div
                      key={p.place}
                      className="glass-card rounded-xl p-3 text-center"
                      style={{ borderColor: `${p.color}30` }}
                    >
                      <div className="text-2xl mb-1">{p.icon}</div>
                      <p className="text-xs font-bold" style={{ color: p.color }}>{p.place} Place</p>
                      <p className="text-xs text-white/50 mt-0.5">{p.prize}</p>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] text-white border-0 font-bold px-10 py-3 text-base"
                >
                  <Play className="w-5 h-5 mr-2 fill-white" />
                  Start Quiz
                </Button>
                {!isAuthenticated && (
                  <p className="text-xs text-white/30 mt-3">
                    <button onClick={() => (window.location.href = getLoginUrl())} className="text-[oklch(0.72_0.2_220)] hover:underline">
                      Sign in
                    </button>{" "}
                    to save your score to the leaderboard
                  </p>
                )}
              </div>
            )}

            {gameState === "playing" && currentQuestion && (
              <div className="animate-fade-in-up">
                {/* Progress */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-white/50">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-sm font-bold text-[oklch(0.72_0.2_220)]">
                    Score: {score}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] rounded-full transition-all duration-1000"
                    style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                  />
                </div>

                {/* Timer */}
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded"
                    style={{
                      background: `oklch(${currentQuestion.difficulty === "easy" ? "0.65 0.22 150" : currentQuestion.difficulty === "medium" ? "0.75 0.18 60" : "0.6 0.22 25"}/0.15)`,
                      color: `oklch(${currentQuestion.difficulty === "easy" ? "0.65 0.22 150" : currentQuestion.difficulty === "medium" ? "0.75 0.18 60" : "0.6 0.22 25"})`,
                    }}
                  >
                    {currentQuestion.difficulty} · {currentQuestion.pointValue}pts
                  </span>
                  <div className={`flex items-center gap-1.5 text-sm font-bold ${timeLeft <= 5 ? "text-[oklch(0.6_0.22_25)]" : "text-white"}`}>
                    <Clock className="w-4 h-4" />
                    {timeLeft}s
                  </div>
                </div>

                {/* Timer bar */}
                <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
                  <div
                    className="timer-bar"
                    key={`${currentIndex}-timer`}
                    style={{ animationDuration: `${QUESTION_TIME}s` }}
                  />
                </div>

                {/* Question */}
                <div className="glass-card rounded-2xl p-6 mb-6">
                  <p className="text-lg font-semibold text-white leading-relaxed">
                    {currentQuestion.question}
                  </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {options.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleAnswer(opt.key)}
                      disabled={answered}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${getOptionStyle(opt.key)}`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {opt.key}
                      </span>
                      <span className="text-sm">{opt.text}</span>
                      {answered && opt.key === currentQuestion.correctAnswer && (
                        <CheckCircle className="w-4 h-4 text-[oklch(0.65_0.22_150)] ml-auto shrink-0" />
                      )}
                      {answered && opt.key === selectedAnswer && opt.key !== currentQuestion.correctAnswer && (
                        <XCircle className="w-4 h-4 text-[oklch(0.6_0.22_25)] ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameState === "finished" && (
              <div className="text-center py-12 animate-fade-in-up">
                <div className="w-24 h-24 rounded-full bg-[oklch(0.75_0.18_60/0.15)] flex items-center justify-center mx-auto mb-6 border border-[oklch(0.75_0.18_60/0.3)]">
                  <Trophy className="w-12 h-12 text-[oklch(0.75_0.18_60)]" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Quiz Complete!</h2>
                <p className="text-white/50 text-sm mb-8">
                  You answered {correctCount} out of {questions.length} questions correctly
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                  <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-[oklch(0.72_0.2_220)]">{score}</p>
                    <p className="text-xs text-white/40 mt-1">Total Score</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-[oklch(0.65_0.22_150)]">{correctCount}</p>
                    <p className="text-xs text-white/40 mt-1">Correct</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-white">
                      {Math.round((correctCount / questions.length) * 100)}%
                    </p>
                    <p className="text-xs text-white/40 mt-1">Accuracy</p>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="glass-card rounded-xl p-4 mb-6 max-w-sm mx-auto border-[oklch(0.72_0.2_220/0.3)]">
                    <Crown className="w-5 h-5 text-[oklch(0.72_0.2_220)] mx-auto mb-2" />
                    <p className="text-sm text-white/70 mb-3">Sign in to save your score and compete on the leaderboard!</p>
                    <Button
                      onClick={() => (window.location.href = getLoginUrl())}
                      size="sm"
                      className="w-full bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-semibold"
                    >
                      Sign In to Save Score
                    </Button>
                  </div>
                )}

                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] text-white border-0 font-bold px-8"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              </div>
            )}
          </div>

          {/* Leaderboard sidebar */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[oklch(0.75_0.18_60)]" />
                <h3 className="text-sm font-bold text-white">Leaderboard</h3>
              </div>
              <div className="divide-y divide-white/5">
                {leaderboard?.map((entry, i) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-6 text-center">
                      {i === 0 ? (
                        <span className="text-base">🥇</span>
                      ) : i === 1 ? (
                        <span className="text-base">🥈</span>
                      ) : i === 2 ? (
                        <span className="text-base">🥉</span>
                      ) : (
                        <span className="text-xs text-white/30 font-bold">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {entry.userName ?? "Anonymous"}
                      </p>
                      <p className="text-xs text-white/30">
                        {entry.correctAnswers}/{entry.questionsAnswered} correct
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[oklch(0.72_0.2_220)]">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!leaderboard || leaderboard.length === 0) && (
                  <div className="px-4 py-8 text-center text-white/30 text-sm">
                    No scores yet. Be the first!
                  </div>
                )}
              </div>
            </div>

            {/* My scores */}
            {isAuthenticated && myScores && myScores.length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <Medal className="w-4 h-4 text-[oklch(0.65_0.25_290)]" />
                  <h3 className="text-sm font-bold text-white">My Recent Scores</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {myScores.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-[oklch(0.72_0.2_220)]">{s.score}</p>
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
            <div className="sub-card-premium rounded-2xl p-4 text-center">
              <Crown className="w-6 h-6 text-[oklch(0.72_0.2_220)] mx-auto mb-2" />
              <p className="text-sm font-bold text-white mb-1">ZTVLIVE+ Premium Quiz</p>
              <p className="text-xs text-white/50 mb-3">Exclusive questions, double points, and bonus prize entries</p>
              <a href="/subscribe">
                <Button size="sm" className="w-full bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] text-white border-0 text-xs font-bold">
                  Upgrade Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
