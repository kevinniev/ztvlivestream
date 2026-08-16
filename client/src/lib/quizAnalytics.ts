import type { QuizEventName } from "@shared/quizTypes";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    umami?: { track?: (event: string, properties?: Record<string, unknown>) => void };
  }
}

export function emitQuizAnalyticsEvent(eventName: QuizEventName, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName, properties);
  window.umami?.track?.(eventName, properties);
}
