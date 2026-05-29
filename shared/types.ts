// Shared types used by both client and server

export interface VideoItem {
  id: number;
  youtubeId: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  category: string;
  tags?: string | null;
  viewCount: number;
  duration?: string | null;
  creatorName?: string | null;
  isFeatured: boolean;
  isLive: boolean;
  publishedAt: Date;
  createdAt: Date;
}

export interface ScheduleItem {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  startTime: number;
  endTime: number;
  isLive: boolean;
  youtubeId?: string | null;
  createdAt: Date;
}

export interface QuizQuestion {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  category: string;
  difficulty: "easy" | "medium" | "hard";
  pointValue: number;
  createdAt: Date;
}

export interface QuizScore {
  id: number;
  userId: number;
  userName?: string | null;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  playedAt: Date;
}
