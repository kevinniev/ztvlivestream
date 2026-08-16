import { describe, expect, it } from "vitest";
import { QUIZ_EVENT_NAMES } from "@shared/quizTypes";
import { arizonaDateKey, calculateAnswerScore, comparePrizeEntries, resolveAttemptMode, themeForArizonaDay } from "./engine";
import { selectDailyQuestionSet } from "./dailyQuestions";

describe("secure daily quiz rules", () => {
  it("keeps scoring authoritative and rejects expired answers", () => {
    expect(calculateAnswerScore({ pointValue: 20, selectedOption: "B", correctOption: "B", elapsedMs: 4_000 })).toMatchObject({ isCorrect: true, pointsAwarded: expect.any(Number) });
    expect(calculateAnswerScore({ pointValue: 20, selectedOption: "B", correctOption: "B", elapsedMs: 20_001 })).toMatchObject({ isCorrect: false, timedOut: true, pointsAwarded: 0 });
  });

  it("only allows a prize-eligible entry for an authenticated, unused, open daily window", () => {
    expect(resolveAttemptMode({ preferredMode: "ranked", isAuthenticated: true, isPrizeWindowOpen: true, hasPriorRankedAttempt: false })).toBe("ranked");
    expect(resolveAttemptMode({ preferredMode: "ranked", isAuthenticated: false, isPrizeWindowOpen: true, hasPriorRankedAttempt: false })).toBe("practice");
    expect(resolveAttemptMode({ preferredMode: "ranked", isAuthenticated: true, isPrizeWindowOpen: true, hasPriorRankedAttempt: true })).toBe("practice");
  });

  it("uses the required daily category mix and Arizona theme schedule", () => {
    const questions = selectDailyQuestionSet("2026-08-16");
    expect(questions).toHaveLength(20);
    expect(questions.filter(question => question.category === "culture")).toHaveLength(8);
    expect(questions.filter(question => question.category === "communitycut")).toHaveLength(5);
    expect(questions.filter(question => question.category === "ztvlive")).toHaveLength(4);
    expect(questions.filter(question => question.category === "general")).toHaveLength(3);
    expect(themeForArizonaDay("2026-08-16")).toBe("Culture & Community Sunday");
    expect(arizonaDateKey(new Date("2026-08-17T06:30:00.000Z"))).toBe("2026-08-16");
  });

  it("applies the stated score, duration, and verified-completion tie-break sequence", () => {
    const entries = [
      { score: 250, durationMs: 12_000, submittedAt: new Date("2026-08-17T06:56:00.000Z") },
      { score: 250, durationMs: 12_000, submittedAt: new Date("2026-08-17T06:54:00.000Z") },
      { score: 200, durationMs: 4_000, submittedAt: new Date("2026-08-17T06:55:00.000Z") },
    ].sort(comparePrizeEntries);
    expect(entries.map(entry => entry.submittedAt.toISOString())).toEqual([
      "2026-08-17T06:54:00.000Z",
      "2026-08-17T06:56:00.000Z",
      "2026-08-17T06:55:00.000Z",
    ]);
  });

  it("preserves the exact analytics vocabulary", () => {
    expect(QUIZ_EVENT_NAMES).toEqual([
      "quiz_view", "quiz_start", "quiz_question_answered", "quiz_completed", "sign_in_prompt_viewed", "sign_up_completed", "score_saved", "premium_cta_clicked", "premium_purchase",
    ]);
  });
});
