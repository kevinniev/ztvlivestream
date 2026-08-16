import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
} from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  dailyQuizzes,
  quizAnalyticsEvents,
  quizAnswers,
  quizAttempts,
  dailyQuizQuestions as quizQuestions,
  dailyQuizScores as quizScores,
  quizWinners,
  users,
} from "../../drizzle/schema";
import type { AnswerOption, QuizEventName, QuizMode } from "@shared/quizTypes";
import { selectDailyQuestionSet } from "./dailyQuestions";
import {
  arizonaDateKey,
  calculateAnswerScore,
  cutoffForArizonaDay,
  DAILY_CUTOFF_LABEL,
  makePublicQuestion,
  pointValueForDifficulty,
  QUESTION_WINDOW_MS,
  comparePrizeEntries,
  resolveAttemptMode,
  themeForArizonaDay,
} from "./engine";
import { getDb } from "../db";

type Viewer = { id: number; name: string | null; email: string | null } | null;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Quiz database is unavailable.");
  return db;
}

function maskName(name: string | null) {
  if (!name) return "ZTVLIVE player";
  const clean = name.trim();
  if (!clean) return "ZTVLIVE player";
  const words = clean.split(/\s+/);
  return words.length > 1 ? `${words[0]} ${words[1][0]}.` : `${words[0][0]}.`;
}

function attemptToken() {
  return randomUUID().replaceAll("-", "");
}

async function getTodayQuizRow(date = new Date()) {
  const db = await database();
  const quizDate = arizonaDateKey(date);
  let quiz = (await db.select().from(dailyQuizzes).where(eq(dailyQuizzes.quizDate, quizDate)).limit(1))[0];
  if (!quiz) {
    await db.insert(dailyQuizzes).values({
      quizDate,
      themeLabel: themeForArizonaDay(quizDate),
      cutoffAt: cutoffForArizonaDay(quizDate),
      status: "live",
    });
    quiz = (await db.select().from(dailyQuizzes).where(eq(dailyQuizzes.quizDate, quizDate)).limit(1))[0];
  }
  if (!quiz) throw new Error("Unable to create today’s quiz.");

  const existingQuestions = await db.select().from(quizQuestions).where(eq(quizQuestions.dailyQuizId, quiz.id));
  if (existingQuestions.length === 0) {
    const dailyQuestionSet = selectDailyQuestionSet(quiz.quizDate);
    await db.insert(quizQuestions).values(
      dailyQuestionSet.map((question, index) => ({
        dailyQuizId: quiz.id,
        ordinal: index + 1,
        category: question.category,
        difficulty: question.difficulty,
        prompt: question.prompt,
        optionsJson: JSON.stringify(question.options),
        correctOption: question.correctOption,
        pointValue: pointValueForDifficulty(question.difficulty),
      })),
    );
  }
  return quiz;
}

async function todayQuestions(dailyQuizId: number) {
  const db = await database();
  return db.select().from(quizQuestions).where(eq(quizQuestions.dailyQuizId, dailyQuizId)).orderBy(asc(quizQuestions.ordinal));
}

async function rankForScore(dailyQuizId: number, score: number, durationMs: number) {
  const db = await database();
  const scores = await db.select({ score: quizScores.score, durationMs: quizScores.durationMs })
    .from(quizScores)
    .where(and(eq(quizScores.dailyQuizId, dailyQuizId), eq(quizScores.prizeEligible, 1)));
  return scores.filter(row => row.score > score || (row.score === score && row.durationMs < durationMs)).length + 1;
}

export async function recordQuizEvent(params: {
  eventName: QuizEventName;
  viewer: Viewer;
  anonymousId?: string;
  quizDate?: string;
  properties?: Record<string, unknown>;
}) {
  const db = await database();
  await db.insert(quizAnalyticsEvents).values({
    eventName: params.eventName,
    userId: params.viewer?.id,
    anonymousId: params.anonymousId?.slice(0, 80),
    quizDate: params.quizDate,
    propertiesJson: JSON.stringify(params.properties ?? {}),
  });
  return { success: true } as const;
}

export async function getQuizExperience(viewer: Viewer) {
  const db = await database();
  const quiz = await getTodayQuizRow();
  const isOpen = new Date() <= quiz.cutoffAt && quiz.status === "live";
  const leaderboard = await db
    .select({ score: quizScores.score, correctAnswers: quizScores.correctAnswers, durationMs: quizScores.durationMs, name: users.name })
    .from(quizScores)
    .innerJoin(users, eq(users.id, quizScores.userId))
    .where(and(eq(quizScores.dailyQuizId, quiz.id), eq(quizScores.prizeEligible, 1)))
    .orderBy(desc(quizScores.score), asc(quizScores.durationMs))
    .limit(10);
  const winners = await db
    .select({ displayName: quizWinners.displayName, prizeTier: quizWinners.prizeTier, quizDate: dailyQuizzes.quizDate })
    .from(quizWinners)
    .innerJoin(dailyQuizzes, eq(dailyQuizzes.id, quizWinners.dailyQuizId))
    .where(inArray(quizWinners.status, ["verified", "notified", "awarded"]))
    .orderBy(desc(quizWinners.createdAt))
    .limit(6);
  const rankedAttemptKey = viewer ? `${quiz.id}:${viewer.id}` : null;
  const rankedAttempt = rankedAttemptKey
    ? (await db.select().from(quizAttempts).where(eq(quizAttempts.rankedAttemptKey, rankedAttemptKey)).limit(1))[0]
    : undefined;

  return {
    quiz: {
      date: quiz.quizDate,
      themeLabel: quiz.themeLabel,
      cutoffLabel: DAILY_CUTOFF_LABEL,
      cutoffAt: quiz.cutoffAt,
      isOpen,
      questionCount: (await todayQuestions(quiz.id)).length,
    },
    eligibility: {
      isAuthenticated: Boolean(viewer),
      hasUsedPrizeEligibleAttempt: Boolean(rankedAttempt),
      canStartRanked: Boolean(viewer && !rankedAttempt && isOpen),
      explanation: !viewer
        ? "Sign in to use today’s one prize-eligible attempt."
        : rankedAttempt
          ? "Your prize-eligible attempt has been used. You can still play practice mode."
          : isOpen
            ? "Your verified ZTVLIVE account can enter one score today."
            : "Today’s prize window has closed. Practice mode remains available.",
    },
    leaderboard: leaderboard.map((row, index) => ({
      rank: index + 1,
      displayName: maskName(row.name),
      score: row.score,
      correctAnswers: row.correctAnswers,
      durationMs: row.durationMs,
    })),
    winners,
  };
}

export async function startQuiz(viewer: Viewer, preferredMode: QuizMode) {
  const db = await database();
  const quiz = await getTodayQuizRow();
  const isOpen = new Date() <= quiz.cutoffAt && quiz.status === "live";
  const requestedRanked = preferredMode === "ranked" && Boolean(viewer) && isOpen;
  const rankedAttemptKey = requestedRanked && viewer ? `${quiz.id}:${viewer.id}` : null;
  if (rankedAttemptKey) {
    const existing = (await db.select().from(quizAttempts).where(eq(quizAttempts.rankedAttemptKey, rankedAttemptKey)).limit(1))[0];
    if (existing && existing.status === "active") {
      const questions = await todayQuestions(quiz.id);
      return {
        attemptToken: existing.attemptToken,
        mode: existing.mode,
        resumed: true,
        themeLabel: quiz.themeLabel,
        questionCount: questions.length,
        questionIndex: existing.questionIndex,
        question: makePublicQuestion(questions[existing.questionIndex]),
        startedAt: existing.startedAt,
      };
    }
  }

  const previousRankedAttempt = rankedAttemptKey
    ? (await db.select().from(quizAttempts).where(eq(quizAttempts.rankedAttemptKey, rankedAttemptKey)).limit(1))[0]
    : undefined;
  const mode = resolveAttemptMode({
    preferredMode,
    isAuthenticated: Boolean(viewer),
    isPrizeWindowOpen: isOpen,
    hasPriorRankedAttempt: Boolean(previousRankedAttempt),
  });
  const token = attemptToken();
  await db.insert(quizAttempts).values({
    attemptToken: token,
    dailyQuizId: quiz.id,
    userId: viewer?.id,
    rankedAttemptKey: mode === "ranked" ? rankedAttemptKey : null,
    mode,
    prizeEligible: mode === "ranked" ? 1 : 0,
  });
  const questions = await todayQuestions(quiz.id);
  const attempt = (await db.select().from(quizAttempts).where(eq(quizAttempts.attemptToken, token)).limit(1))[0];
  if (!attempt) throw new Error("Unable to start quiz session.");
  return {
    attemptToken: attempt.attemptToken,
    mode,
    resumed: false,
    themeLabel: quiz.themeLabel,
    questionCount: questions.length,
    questionIndex: 0,
    question: makePublicQuestion(questions[0]),
    startedAt: attempt.startedAt,
  };
}

export async function submitAuthoritativeAnswer(params: { viewer: Viewer; attemptToken: string; selectedOption: AnswerOption }) {
  const db = await database();
  const attempt = (await db.select().from(quizAttempts).where(eq(quizAttempts.attemptToken, params.attemptToken)).limit(1))[0];
  if (!attempt || attempt.status !== "active") throw new Error("This quiz session is unavailable.");
  if (attempt.userId && attempt.userId !== params.viewer?.id) throw new Error("This quiz session belongs to another account.");
  const quiz = (await db.select().from(dailyQuizzes).where(eq(dailyQuizzes.id, attempt.dailyQuizId)).limit(1))[0];
  if (!quiz) throw new Error("Quiz day not found.");
  if (attempt.mode === "ranked" && new Date() > quiz.cutoffAt) {
    await db.update(quizAttempts).set({ status: "expired" }).where(eq(quizAttempts.id, attempt.id));
    throw new Error("The Arizona MST prize window has closed. Please continue in practice mode.");
  }
  const questions = await todayQuestions(attempt.dailyQuizId);
  const question = questions[attempt.questionIndex];
  if (!question) throw new Error("No active question was found.");
  const existingAnswer = (await db.select().from(quizAnswers).where(and(eq(quizAnswers.attemptId, attempt.id), eq(quizAnswers.questionId, question.id))).limit(1))[0];
  if (existingAnswer) throw new Error("This question has already been submitted.");

  const result = calculateAnswerScore({
    pointValue: question.pointValue,
    selectedOption: params.selectedOption,
    correctOption: question.correctOption,
    elapsedMs: Date.now() - attempt.questionStartedAt.getTime(),
  });
  const nextIndex = attempt.questionIndex + 1;
  const completed = nextIndex >= questions.length;
  const updatedScore = attempt.score + result.pointsAwarded;
  const updatedCorrect = attempt.correctAnswers + (result.isCorrect ? 1 : 0);
  const now = new Date();
  await db.insert(quizAnswers).values({
    attemptId: attempt.id,
    questionId: question.id,
    selectedOption: params.selectedOption,
    isCorrect: result.isCorrect ? 1 : 0,
    elapsedMs: Math.min(Date.now() - attempt.questionStartedAt.getTime(), QUESTION_WINDOW_MS),
    speedBonus: result.speedBonus,
    pointsAwarded: result.pointsAwarded,
  });
  await db.update(quizAttempts).set({
    questionIndex: nextIndex,
    score: updatedScore,
    correctAnswers: updatedCorrect,
    questionStartedAt: now,
    status: completed ? "completed" : "active",
    completedAt: completed ? now : null,
  }).where(eq(quizAttempts.id, attempt.id));

  let completion: null | { provisionalRank: number | null; entered: boolean; totalScore: number; correctAnswers: number; durationMs: number } = null;
  if (completed) {
    const durationMs = now.getTime() - attempt.startedAt.getTime();
    const entered = attempt.mode === "ranked" && Boolean(params.viewer) && attempt.prizeEligible === 1;
    if (entered && params.viewer) {
      await db.insert(quizScores).values({
        dailyQuizId: attempt.dailyQuizId,
        userId: params.viewer.id,
        attemptId: attempt.id,
        score: updatedScore,
        correctAnswers: updatedCorrect,
        durationMs,
        prizeEligible: 1,
      });
    }
    completion = {
      provisionalRank: entered ? await rankForScore(attempt.dailyQuizId, updatedScore, durationMs) : null,
      entered,
      totalScore: updatedScore,
      correctAnswers: updatedCorrect,
      durationMs,
    };
  }
  return {
    answer: {
      isCorrect: result.isCorrect,
      timedOut: result.timedOut,
      speedBonus: result.speedBonus,
      pointsAwarded: result.pointsAwarded,
      score: updatedScore,
      correctAnswers: updatedCorrect,
    },
    completed,
    completion,
    nextQuestion: !completed ? makePublicQuestion(questions[nextIndex]) : null,
  };
}

export async function getAnalyticsSummary(days: 7 | 28 | 90) {
  const db = await database();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await db.select().from(quizAnalyticsEvents).where(gte(quizAnalyticsEvents.createdAt, from));
  const counts = Object.fromEntries([
    "quiz_view",
    "quiz_start",
    "quiz_question_answered",
    "quiz_completed",
    "sign_in_prompt_viewed",
    "sign_up_completed",
    "score_saved",
    "premium_cta_clicked",
    "premium_purchase",
  ].map(name => [name, events.filter(event => event.eventName === name).length]));
  const funnel = {
    views: counts.quiz_view ?? 0,
    starts: counts.quiz_start ?? 0,
    completions: counts.quiz_completed ?? 0,
    scoresSaved: counts.score_saved ?? 0,
    premiumClicks: counts.premium_cta_clicked ?? 0,
    premiumPurchases: counts.premium_purchase ?? 0,
  };
  return {
    days,
    counts,
    funnel,
    completionRate: funnel.starts ? Math.round((funnel.completions / funnel.starts) * 1000) / 10 : 0,
    scoreSaveRate: funnel.completions ? Math.round((funnel.scoresSaved / funnel.completions) * 1000) / 10 : 0,
  };
}

export async function getWinnerCandidates() {
  const db = await database();
  const quiz = await getTodayQuizRow();
  const candidates = await db
    .select({ scoreId: quizScores.id, score: quizScores.score, durationMs: quizScores.durationMs, submittedAt: quizScores.submittedAt, name: users.name })
    .from(quizScores)
    .innerJoin(users, eq(users.id, quizScores.userId))
    .where(and(eq(quizScores.dailyQuizId, quiz.id), eq(quizScores.prizeEligible, 1)))
    .orderBy(desc(quizScores.score), asc(quizScores.durationMs))
    .limit(3);
  const orderedCandidates = [...candidates].sort(comparePrizeEntries);
  return { quiz, candidates: orderedCandidates.map((candidate, index) => ({ ...candidate, displayName: maskName(candidate.name), prizeTier: ["first", "second", "third"][index] as "first" | "second" | "third" })) };
}

export async function queueWinnerReview() {
  const db = await database();
  const { quiz, candidates } = await getWinnerCandidates();
  for (const candidate of candidates) {
    await db.insert(quizWinners).values({
      dailyQuizId: quiz.id,
      scoreId: candidate.scoreId,
      prizeTier: candidate.prizeTier,
      displayName: candidate.displayName,
      status: "pending_review",
    }).onDuplicateKeyUpdate({ set: { scoreId: candidate.scoreId, displayName: candidate.displayName, status: "pending_review" } });
  }
  await db.update(dailyQuizzes).set({ status: "reviewing" }).where(eq(dailyQuizzes.id, quiz.id));
  return { success: true, candidateCount: candidates.length } as const;
}

export async function getWinnerReviewQueue() {
  const db = await database();
  const quiz = await getTodayQuizRow();
  const queue = await db
    .select({
      id: quizWinners.id,
      displayName: quizWinners.displayName,
      prizeTier: quizWinners.prizeTier,
      status: quizWinners.status,
      verificationNotes: quizWinners.verificationNotes,
      score: quizScores.score,
      durationMs: quizScores.durationMs,
    })
    .from(quizWinners)
    .innerJoin(quizScores, eq(quizScores.id, quizWinners.scoreId))
    .where(eq(quizWinners.dailyQuizId, quiz.id))
    .orderBy(asc(quizWinners.prizeTier));
  return { quiz, queue };
}

export async function updateWinnerStatus(params: { winnerId: number; status: "verified" | "notified" | "awarded" | "disqualified"; notes?: string }) {
  const db = await database();
  const now = new Date();
  await db.update(quizWinners).set({
    status: params.status,
    verificationNotes: params.notes ?? null,
    verifiedAt: params.status === "verified" ? now : undefined,
    notifiedAt: params.status === "notified" ? now : undefined,
    awardedAt: params.status === "awarded" ? now : undefined,
  }).where(eq(quizWinners.id, params.winnerId));
  return { success: true } as const;
}
