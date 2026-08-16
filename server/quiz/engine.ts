import type { AnswerOption, PublicQuizQuestion, QuizCategory, QuizMode } from "@shared/quizTypes";

export const QUESTION_WINDOW_MS = 20_000;
export const DAILY_CUTOFF_LABEL = "11:59 PM Arizona MST";

export type PrivateSeedQuestion = {
  category: QuizCategory;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  options: [string, string, string, string];
  correctOption: AnswerOption;
};

export function arizonaDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function cutoffForArizonaDay(dayKey: string): Date {
  return new Date(`${dayKey}T23:59:59-07:00`);
}

export function themeForArizonaDay(dayKey: string): string {
  const day = new Date(`${dayKey}T12:00:00-07:00`).getDay();
  const themes = [
    "Culture & Community Sunday",
    "Fresh Start Monday",
    "Creator Spotlight Tuesday",
    "ZTVLIVE Premiere Wednesday",
    "Culture After Dark Thursday",
    "CommunityCut Friday",
    "Weekend Watchlist Saturday",
  ];
  return themes[day] ?? "Creator Spotlight Tuesday";
}

export function pointValueForDifficulty(difficulty: PrivateSeedQuestion["difficulty"]): number {
  if (difficulty === "easy") return 10;
  if (difficulty === "medium") return 20;
  return 30;
}

export function calculateAnswerScore(params: {
  pointValue: number;
  selectedOption: AnswerOption;
  correctOption: AnswerOption;
  elapsedMs: number;
}) {
  const timedOut = params.elapsedMs > QUESTION_WINDOW_MS;
  const isCorrect = !timedOut && params.selectedOption === params.correctOption;
  const speedBonus = isCorrect
    ? Math.max(0, Math.floor(((QUESTION_WINDOW_MS - Math.min(params.elapsedMs, QUESTION_WINDOW_MS)) / QUESTION_WINDOW_MS) * 50))
    : 0;
  return {
    timedOut,
    isCorrect,
    speedBonus,
    pointsAwarded: isCorrect ? params.pointValue + speedBonus : 0,
  };
}

export function resolveAttemptMode(params: {
  preferredMode: QuizMode;
  isAuthenticated: boolean;
  isPrizeWindowOpen: boolean;
  hasPriorRankedAttempt: boolean;
}): QuizMode {
  if (
    params.preferredMode === "ranked"
    && params.isAuthenticated
    && params.isPrizeWindowOpen
    && !params.hasPriorRankedAttempt
  ) return "ranked";
  return "practice";
}

export function comparePrizeEntries(
  a: { score: number; durationMs: number; submittedAt: Date },
  b: { score: number; durationMs: number; submittedAt: Date },
) {
  return b.score - a.score || a.durationMs - b.durationMs || a.submittedAt.getTime() - b.submittedAt.getTime();
}

export function makePublicQuestion(question: {
  id: number;
  ordinal: number;
  category: QuizCategory;
  prompt: string;
  optionsJson: string;
  pointValue: number;
}): PublicQuizQuestion {
  return {
    id: question.id,
    ordinal: question.ordinal,
    category: question.category,
    prompt: question.prompt,
    options: JSON.parse(question.optionsJson) as string[],
    pointValue: question.pointValue,
  };
}
