export const QUIZ_EVENT_NAMES = [
  "quiz_view",
  "quiz_start",
  "quiz_question_answered",
  "quiz_completed",
  "sign_in_prompt_viewed",
  "sign_up_completed",
  "score_saved",
  "premium_cta_clicked",
  "premium_purchase",
] as const;

export type QuizEventName = (typeof QUIZ_EVENT_NAMES)[number];
export type QuizMode = "ranked" | "practice";
export type QuizCategory = "culture" | "communitycut" | "ztvlive" | "general";
export type AnswerOption = "A" | "B" | "C" | "D";

export type PublicQuizQuestion = {
  id: number;
  ordinal: number;
  category: QuizCategory;
  prompt: string;
  options: string[];
  pointValue: number;
};

export type QuizSession = {
  attemptToken: string;
  mode: QuizMode;
  themeLabel: string;
  questionCount: number;
  question: PublicQuizQuestion | null;
  startedAt: Date;
};
