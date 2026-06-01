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
  youtubeId: varchar("youtubeId", { length: 32 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  category: mysqlEnum("category", ["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"]).default("other").notNull(),
  tags: text("tags"), // comma-separated
  viewCount: int("viewCount").default(0).notNull(),
  duration: varchar("duration", { length: 20 }),
  creatorName: varchar("creatorName", { length: 128 }),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isLive: boolean("isLive").default(false).notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
