import { z } from "zod";
import { QUIZ_EVENT_NAMES } from "@shared/quizTypes";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getAnalyticsSummary,
  getQuizExperience,
  getWinnerCandidates,
  getWinnerReviewQueue,
  queueWinnerReview,
  recordQuizEvent,
  startQuiz,
  submitAuthoritativeAnswer,
  updateWinnerStatus,
} from "./service";

const viewerFromContext = (user: { id: number; name: string | null; email: string | null } | null) => user ? ({ id: user.id, name: user.name, email: user.email }) : null;

export const quizRouter = router({
  experience: publicProcedure.query(({ ctx }) => getQuizExperience(viewerFromContext(ctx.user))),
  start: publicProcedure.input(z.object({ preferredMode: z.enum(["ranked", "practice"]) })).mutation(({ ctx, input }) =>
    startQuiz(viewerFromContext(ctx.user), input.preferredMode),
  ),
  answer: publicProcedure.input(z.object({
    attemptToken: z.string().min(16).max(64),
    selectedOption: z.enum(["A", "B", "C", "D"]),
  })).mutation(({ ctx, input }) => submitAuthoritativeAnswer({ viewer: viewerFromContext(ctx.user), ...input })),
  recordEvent: publicProcedure.input(z.object({
    eventName: z.enum(QUIZ_EVENT_NAMES),
    anonymousId: z.string().max(80).optional(),
    quizDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
  })).mutation(({ ctx, input }) => recordQuizEvent({ viewer: viewerFromContext(ctx.user), ...input })),
  myRankedEntry: protectedProcedure.query(async ({ ctx }) => getQuizExperience(viewerFromContext(ctx.user))),
  analytics: adminProcedure.input(z.object({ days: z.union([z.literal(7), z.literal(28), z.literal(90)]) })).query(({ input }) => getAnalyticsSummary(input.days)),
  winnerCandidates: adminProcedure.query(() => getWinnerCandidates()),
  winnerReviewQueue: adminProcedure.query(() => getWinnerReviewQueue()),
  queueWinnerReview: adminProcedure.mutation(() => queueWinnerReview()),
  updateWinnerStatus: adminProcedure.input(z.object({
    winnerId: z.number().int().positive(),
    status: z.enum(["verified", "notified", "awarded", "disqualified"]),
    notes: z.string().max(1000).optional(),
  })).mutation(({ input }) => updateWinnerStatus(input)),
});
