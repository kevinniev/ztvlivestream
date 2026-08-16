import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
  float,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/* ============================================================
   Core Users
   ============================================================ */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "creator"]).default("user").notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "basic", "premium", "creator_pro"]).default("free").notNull(),
  // Auth provider fields
  passwordHash: text("passwordHash"),
  provider: varchar("provider", { length: 32 }).default("email").notNull(), // email | google | facebook
  providerId: varchar("providerId", { length: 128 }), // OAuth provider user ID
  avatar: text("avatar"),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  // Stripe identifiers
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 32 }).default("inactive"),
  subscriptionCurrentPeriodEnd: bigint("subscriptionCurrentPeriodEnd", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  phone: varchar("phone", { length: 20 }),
  smsOptIn: boolean("smsOptIn").default(false).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ============================================================
   Videos / Content
   ============================================================ */
export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  youtubeId: varchar("youtubeId", { length: 128 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  category: mysqlEnum("category", ["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"]).default("other").notNull(),
  tags: text("tags"), // comma-separated
  viewCount: int("viewCount").default(0).notNull(),
  likeCount: int("likeCount").default(0).notNull(),
  duration: varchar("duration", { length: 20 }),
  creatorName: varchar("creatorName", { length: 128 }),
  // Hard ownership link — set on import/upload, used for library & revenue
  creatorId: int("creatorId"), // FK → users.id (nullable for platform/admin content)
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isLive: boolean("isLive").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "live"]).default("approved").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // AI-generated content (cached, generated on demand)
  aiTranscript: text("aiTranscript"),
  aiDescription: text("aiDescription"),
  aiFaq: text("aiFaq"), // JSON array of {question, answer} objects
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/* ============================================================
   Watchlist
   ============================================================ */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;

/* ============================================================
   Quiz Questions
   ============================================================ */
export const quizQuestions = mysqlTable("quiz_questions", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question").notNull(),
  optionA: varchar("optionA", { length: 255 }).notNull(),
  optionB: varchar("optionB", { length: 255 }).notNull(),
  optionC: varchar("optionC", { length: 255 }).notNull(),
  optionD: varchar("optionD", { length: 255 }).notNull(),
  correctAnswer: mysqlEnum("correctAnswer", ["A", "B", "C", "D"]).notNull(),
  category: varchar("category", { length: 64 }).default("general").notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  pointValue: int("pointValue").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;

/* ============================================================
   Quiz Scores
   ============================================================ */
export const quizScores = mysqlTable("quiz_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 128 }),
  score: int("score").default(0).notNull(),
  questionsAnswered: int("questionsAnswered").default(0).notNull(),
  correctAnswers: int("correctAnswers").default(0).notNull(),
  playedAt: timestamp("playedAt").defaultNow().notNull(),
});

export type QuizScore = typeof quizScores.$inferSelect;

/* ============================================================
   Secure Daily Quiz
   Correct answers, scoring state, and prize eligibility are held
   server-side. Legacy quiz tables above remain for historical data.
   ============================================================ */
export const dailyQuizzes = mysqlTable("dailyQuizzes", {
  id: int("id").autoincrement().primaryKey(),
  quizDate: varchar("quizDate", { length: 10 }).notNull().unique(),
  themeLabel: varchar("themeLabel", { length: 100 }).notNull(),
  cutoffAt: timestamp("cutoffAt").notNull(),
  status: mysqlEnum("status", ["scheduled", "live", "closed", "reviewing", "awarded"]).default("live").notNull(),
  rulesVersion: varchar("rulesVersion", { length: 32 }).default("2026-08-16").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const dailyQuizQuestions = mysqlTable("dailyQuizQuestions", {
  id: int("id").autoincrement().primaryKey(),
  dailyQuizId: int("dailyQuizId").notNull().references(() => dailyQuizzes.id),
  ordinal: int("ordinal").notNull(),
  category: mysqlEnum("category", ["culture", "communitycut", "ztvlive", "general"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  prompt: text("prompt").notNull(),
  optionsJson: text("optionsJson").notNull(),
  correctOption: mysqlEnum("correctOption", ["A", "B", "C", "D"]).notNull(),
  pointValue: int("pointValue").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("daily_quiz_question_ordinal_unique").on(table.dailyQuizId, table.ordinal),
  index("daily_quiz_question_daily_idx").on(table.dailyQuizId),
]);

export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  attemptToken: varchar("attemptToken", { length: 64 }).notNull().unique(),
  dailyQuizId: int("dailyQuizId").notNull().references(() => dailyQuizzes.id),
  userId: int("userId").references(() => users.id),
  rankedAttemptKey: varchar("rankedAttemptKey", { length: 64 }).unique(),
  mode: mysqlEnum("mode", ["ranked", "practice"]).notNull(),
  status: mysqlEnum("status", ["active", "completed", "expired"]).default("active").notNull(),
  questionIndex: int("questionIndex").default(0).notNull(),
  score: int("score").default(0).notNull(),
  correctAnswers: int("correctAnswers").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  questionStartedAt: timestamp("questionStartedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  prizeEligible: int("prizeEligible").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("secure_quiz_attempt_daily_idx").on(table.dailyQuizId), index("secure_quiz_attempt_user_idx").on(table.userId)]);

export const quizAnswers = mysqlTable("quizAnswers", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull().references(() => quizAttempts.id),
  questionId: int("questionId").notNull().references(() => dailyQuizQuestions.id),
  selectedOption: mysqlEnum("selectedOption", ["A", "B", "C", "D"]).notNull(),
  isCorrect: int("isCorrect").default(0).notNull(),
  elapsedMs: int("elapsedMs").notNull(),
  speedBonus: int("speedBonus").default(0).notNull(),
  pointsAwarded: int("pointsAwarded").default(0).notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
}, table => [uniqueIndex("secure_quiz_answer_once_per_question").on(table.attemptId, table.questionId), index("secure_quiz_answer_attempt_idx").on(table.attemptId)]);

export const dailyQuizScores = mysqlTable("dailyQuizScores", {
  id: int("id").autoincrement().primaryKey(),
  dailyQuizId: int("dailyQuizId").notNull().references(() => dailyQuizzes.id),
  userId: int("userId").notNull().references(() => users.id),
  attemptId: int("attemptId").notNull().references(() => quizAttempts.id).unique(),
  score: int("score").notNull(),
  correctAnswers: int("correctAnswers").notNull(),
  durationMs: int("durationMs").notNull(),
  prizeEligible: int("prizeEligible").default(0).notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, table => [index("secure_quiz_score_daily_idx").on(table.dailyQuizId), index("secure_quiz_score_user_idx").on(table.userId)]);

export const quizWinners = mysqlTable("quizWinners", {
  id: int("id").autoincrement().primaryKey(),
  dailyQuizId: int("dailyQuizId").notNull().references(() => dailyQuizzes.id),
  scoreId: int("scoreId").notNull().references(() => dailyQuizScores.id).unique(),
  prizeTier: mysqlEnum("prizeTier", ["first", "second", "third"]).notNull(),
  displayName: varchar("displayName", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["pending_review", "verified", "notified", "awarded", "disqualified"]).default("pending_review").notNull(),
  verificationNotes: text("verificationNotes"),
  verifiedAt: timestamp("verifiedAt"),
  notifiedAt: timestamp("notifiedAt"),
  awardedAt: timestamp("awardedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("secure_quiz_winner_daily_idx").on(table.dailyQuizId), uniqueIndex("secure_quiz_winner_tier_daily_unique").on(table.dailyQuizId, table.prizeTier)]);

export const quizAnalyticsEvents = mysqlTable("quizAnalyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventName: mysqlEnum("eventName", ["quiz_view", "quiz_start", "quiz_question_answered", "quiz_completed", "sign_in_prompt_viewed", "sign_up_completed", "score_saved", "premium_cta_clicked", "premium_purchase"]).notNull(),
  userId: int("userId").references(() => users.id),
  anonymousId: varchar("anonymousId", { length: 80 }),
  quizDate: varchar("quizDate", { length: 10 }),
  propertiesJson: text("propertiesJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("secure_quiz_analytics_event_idx").on(table.eventName), index("secure_quiz_analytics_created_idx").on(table.createdAt)]);

/* ============================================================
   Program Schedule
   ============================================================ */
export const scheduleItems = mysqlTable("schedule_items", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  thumbnailUrl: text("thumbnailUrl"),
  startTime: bigint("startTime", { mode: "number" }).notNull(), // UTC ms
  endTime: bigint("endTime", { mode: "number" }).notNull(),
  isLive: boolean("isLive").default(false).notNull(),
  youtubeId: varchar("youtubeId", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduleItem = typeof scheduleItems.$inferSelect;

/* ============================================================
   Show Reminders
   ============================================================ */
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  scheduleItemId: int("scheduleItemId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;

/* ============================================================
   Creator Upload Slots
   ============================================================ */
export const uploadSlots = mysqlTable("upload_slots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "aired"]).default("pending").notNull(),
  youtubeId: varchar("youtubeId", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UploadSlot = typeof uploadSlots.$inferSelect;

/* ============================================================
   Newsletter Subscribers
   ============================================================ */
export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
});

/* ============================================================
   SMS Subscribers
   ============================================================ */
export const smsSubscribers = mysqlTable("sms_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 128 }),
  source: varchar("source", { length: 64 }).default("homepage").notNull(), // homepage | creator_form | checkout
  optedIn: boolean("optedIn").default(true).notNull(),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
});

export type SmsSubscriber = typeof smsSubscribers.$inferSelect;

/* ============================================================
   Creator Scout — Prospects
   ============================================================ */
export const creatorProspects = mysqlTable("creator_prospects", {
  id: int("id").autoincrement().primaryKey(),
  handle: varchar("handle", { length: 128 }).notNull(),
  platform: mysqlEnum("platform", ["youtube", "instagram", "tiktok", "twitter", "reddit", "other"]).notNull(),
  profileUrl: varchar("profileUrl", { length: 512 }).notNull(),
  displayName: varchar("displayName", { length: 256 }),
  bio: text("bio"),
  followerCount: int("followerCount").default(0),
  videoCount: int("videoCount").default(0),
  avgViews: int("avgViews").default(0),
  engagementRate: varchar("engagementRate", { length: 16 }),
  niche: varchar("niche", { length: 64 }).notNull(),
  score: int("score").default(0).notNull(),
  tags: text("tags"), // JSON array
  status: mysqlEnum("status", ["new", "contacted", "applied", "approved", "rejected", "unresponsive"]).default("new").notNull(),
  outreachSentAt: bigint("outreachSentAt", { mode: "number" }),
  outreachChannel: mysqlEnum("outreachChannel", ["email", "sms", "dm", "none"]).default("none"),
  notes: text("notes"),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull().unique(),
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  scanRunId: varchar("scanRunId", { length: 64 }),
});
export type CreatorProspect = typeof creatorProspects.$inferSelect;

/* ============================================================
   Creator Scout — Scan Runs (audit log)
   ============================================================ */
export const scoutScanRuns = mysqlTable("scout_scan_runs", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("runId", { length: 64 }).notNull().unique(),
  triggeredBy: mysqlEnum("triggeredBy", ["heartbeat", "manual", "admin"]).default("heartbeat").notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  nichesScanned: text("nichesScanned"), // JSON array
  prospectsFound: int("prospectsFound").default(0),
  prospectsNew: int("prospectsNew").default(0),
  prospectsSkipped: int("prospectsSkipped").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
});
export type ScoutScanRun = typeof scoutScanRuns.$inferSelect;

/* ============================================================
   Studio Mode — Guest Invite Sessions (Phase 2)
   ============================================================ */
export const studioSessions = mysqlTable("studio_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  hostUserId: int("hostUserId").notNull(),
  title: varchar("title", { length: 255 }).default("ZTVLIVE Studio Session"),
  status: mysqlEnum("status", ["waiting", "live", "ended"]).default("waiting").notNull(),
  virtualSetId: varchar("virtualSetId", { length: 64 }).default("none"),
  inviteToken: varchar("inviteToken", { length: 128 }).notNull().unique(),
  inviteExpiresAt: bigint("inviteExpiresAt", { mode: "number" }),
  guestName: varchar("guestName", { length: 128 }),
  guestJoinedAt: bigint("guestJoinedAt", { mode: "number" }),
  startedAt: bigint("startedAt", { mode: "number" }),
  endedAt: bigint("endedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StudioSession = typeof studioSessions.$inferSelect;

/* ============================================================
   Studio Mode — Show Rundowns (Phase 3)
   ============================================================ */
export const studioRundowns = mysqlTable("studio_rundowns", {
  id: int("id").autoincrement().primaryKey(),
  rundownId: varchar("rundownId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  segments: text("segments").notNull(), // JSON array of RundownSegment
  totalDurationSeconds: int("totalDurationSeconds").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type StudioRundown = typeof studioRundowns.$inferSelect;

/* ============================================================
   Studio Mode — Stream Destinations (Phase 4)
   ============================================================ */
export const studioStreamDestinations = mysqlTable("studio_stream_destinations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["youtube", "twitch", "ztvlive", "custom"]).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  rtmpUrl: varchar("rtmpUrl", { length: 512 }).notNull(),
  streamKey: varchar("streamKey", { length: 256 }).notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StudioStreamDestination = typeof studioStreamDestinations.$inferSelect;

/* ============================================================
   Social Media Auto-Posts
   ============================================================ */
export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "facebook", "twitter", "tiktok"]).notNull(),
  contentType: mysqlEnum("contentType", ["post", "reel", "story", "thread"]).notNull().default("post"),
  caption: text("caption").notNull(),
  mediaUrl: varchar("mediaUrl", { length: 1024 }),
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed"]).notNull().default("draft"),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  externalPostId: varchar("externalPostId", { length: 256 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SocialPost = typeof socialPosts.$inferSelect;

/* ============================================================
   Content Pipeline Jobs (Automation)
   ============================================================ */
export const contentPipelineJobs = mysqlTable("content_pipeline_jobs", {
  id: int("id").autoincrement().primaryKey(),
  pipelineType: mysqlEnum("pipelineType", ["zara-daily", "zoe-weekly"]).notNull(),
  status: mysqlEnum("status", ["running", "render_pending", "uploading", "completed", "failed"]).default("running").notNull(),
  scheduledDate: varchar("scheduledDate", { length: 16 }).notNull(), // YYYY-MM-DD
  heygenVideoId: varchar("heygenVideoId", { length: 128 }),
  scriptTitle: varchar("scriptTitle", { length: 255 }),
  scriptDescription: text("scriptDescription"),
  scriptTags: text("scriptTags"), // comma-separated
  outfitLookId: varchar("outfitLookId", { length: 128 }),
  brollCount: int("brollCount").default(0),
  youtubeVideoId: varchar("youtubeVideoId", { length: 64 }),
  youtubeUrl: varchar("youtubeUrl", { length: 512 }),
  errorMessage: text("errorMessage"),
  startedAt: bigint("startedAt", { mode: "bigint" }),
  completedAt: bigint("completedAt", { mode: "bigint" }),
  updatedAt: bigint("updatedAt", { mode: "bigint" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentPipelineJob = typeof contentPipelineJobs.$inferSelect;

/* ============================================================
   Creator Revenue Events
   Tracks ad revenue, subscription share, and PPV per video per creator.
   This is the source of truth for revenue attribution and payouts.
   ============================================================ */
export const creatorRevenueEvents = mysqlTable("creator_revenue_events", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),     // FK → users.id
  videoId: int("videoId"),                   // FK → videos.id (null for channel-level events)
  eventType: mysqlEnum("eventType", [
    "ad_view",          // Pre/mid-roll ad impression on creator video
    "subscription_share", // Monthly subscription revenue share
    "ppv",              // Pay-per-view event revenue
    "bonus",            // Manual bonus from admin
  ]).notNull(),
  grossAmount: float("grossAmount").notNull(),   // Total revenue before split (USD)
  creatorShare: float("creatorShare").notNull(), // Creator's 70% cut (USD)
  platformShare: float("platformShare").notNull(), // Platform's 30% cut (USD)
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "cancelled"]).default("pending").notNull(),
  periodStart: bigint("periodStart", { mode: "number" }), // UTC ms
  periodEnd: bigint("periodEnd", { mode: "number" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CreatorRevenueEvent = typeof creatorRevenueEvents.$inferSelect;

/* ============================================================
   Creator Payout Requests
   Tracks when creators request payment of their earned balance.
   ============================================================ */
export const creatorPayoutRequests = mysqlTable("creator_payout_requests", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),     // FK → users.id
  amount: float("amount").notNull(),         // Amount requested (USD)
  method: mysqlEnum("method", ["paypal", "bank_transfer", "check"]).default("paypal").notNull(),
  paymentDetails: text("paymentDetails"),    // Encrypted payment info (email/account)
  status: mysqlEnum("status", ["pending", "processing", "paid", "rejected"]).default("pending").notNull(),
  notes: text("notes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});
export type CreatorPayoutRequest = typeof creatorPayoutRequests.$inferSelect;

/* ============================================================
   Live Streams
   Tracks creator-initiated live broadcasts. Each stream has a
   unique streamKey (for OBS/RTMP) and a playbackUrl (for viewers).
   Browser-based streams use Daily.co room URLs stored in playbackUrl.
   ============================================================ */
export const liveStreams = mysqlTable("live_streams", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),          // FK → users.id
  creatorName: varchar("creatorName", { length: 128 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  category: mysqlEnum("category", ["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"]).default("other").notNull(),
  status: mysqlEnum("status", ["scheduled", "live", "ended"]).default("scheduled").notNull(),
  // Stream key for OBS/RTMP external encoders
  streamKey: varchar("streamKey", { length: 64 }).notNull().unique(),
  // Playback: YouTube live embed ID (for RTMP→YouTube relay) or Daily.co room name
  playbackType: mysqlEnum("playbackType", ["youtube", "daily", "rtmp"]).default("youtube").notNull(),
  playbackId: varchar("playbackId", { length: 255 }), // YouTube video ID or Daily room name
  viewerCount: int("viewerCount").default(0).notNull(),
  peakViewerCount: int("peakViewerCount").default(0).notNull(),
  chatEnabled: boolean("chatEnabled").default(true).notNull(),
  scheduledAt: bigint("scheduledAt", { mode: "number" }),  // UTC ms, for scheduled streams
  startedAt: bigint("startedAt", { mode: "number" }),      // UTC ms, when went live
  endedAt: bigint("endedAt", { mode: "number" }),          // UTC ms, when ended
  vodUrl: text("vodUrl"),                                   // VOD URL after stream ends
  tags: text("tags"),                                       // comma-separated
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LiveStream = typeof liveStreams.$inferSelect;
export type InsertLiveStream = typeof liveStreams.$inferInsert;

/* ============================================================
   Live Chat Messages
   Real-time chat for live streams. Polled every 3s by viewers.
   ============================================================ */
export const liveChatMessages = mysqlTable("live_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  streamId: int("streamId").notNull(),            // FK → live_streams.id
  userId: int("userId"),                           // FK → users.id (null = anonymous)
  displayName: varchar("displayName", { length: 64 }).notNull(),
  avatarUrl: text("avatarUrl"),
  message: text("message").notNull(),
  isCreator: boolean("isCreator").default(false).notNull(),  // Highlighted if creator
  isPinned: boolean("isPinned").default(false).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LiveChatMessage = typeof liveChatMessages.$inferSelect;
