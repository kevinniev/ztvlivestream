CREATE TABLE `dailyQuizQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dailyQuizId` int NOT NULL,
	`ordinal` int NOT NULL,
	`category` enum('culture','communitycut','ztvlive','general') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`prompt` text NOT NULL,
	`optionsJson` text NOT NULL,
	`correctOption` enum('A','B','C','D') NOT NULL,
	`pointValue` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyQuizQuestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_quiz_question_ordinal_unique` UNIQUE(`dailyQuizId`,`ordinal`)
);
--> statement-breakpoint
CREATE TABLE `dailyQuizScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dailyQuizId` int NOT NULL,
	`userId` int NOT NULL,
	`attemptId` int NOT NULL,
	`score` int NOT NULL,
	`correctAnswers` int NOT NULL,
	`durationMs` int NOT NULL,
	`prizeEligible` int NOT NULL DEFAULT 0,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyQuizScores_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyQuizScores_attemptId_unique` UNIQUE(`attemptId`)
);
--> statement-breakpoint
CREATE TABLE `dailyQuizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizDate` varchar(10) NOT NULL,
	`themeLabel` varchar(100) NOT NULL,
	`cutoffAt` timestamp NOT NULL,
	`status` enum('scheduled','live','closed','reviewing','awarded') NOT NULL DEFAULT 'live',
	`rulesVersion` varchar(32) NOT NULL DEFAULT '2026-08-16',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyQuizzes_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyQuizzes_quizDate_unique` UNIQUE(`quizDate`)
);
--> statement-breakpoint
CREATE TABLE `quizAnalyticsEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` enum('quiz_view','quiz_start','quiz_question_answered','quiz_completed','sign_in_prompt_viewed','sign_up_completed','score_saved','premium_cta_clicked','premium_purchase') NOT NULL,
	`userId` int,
	`anonymousId` varchar(80),
	`quizDate` varchar(10),
	`propertiesJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAnalyticsEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOption` enum('A','B','C','D') NOT NULL,
	`isCorrect` int NOT NULL DEFAULT 0,
	`elapsedMs` int NOT NULL,
	`speedBonus` int NOT NULL DEFAULT 0,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAnswers_id` PRIMARY KEY(`id`),
	CONSTRAINT `secure_quiz_answer_once_per_question` UNIQUE(`attemptId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `quizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptToken` varchar(64) NOT NULL,
	`dailyQuizId` int NOT NULL,
	`userId` int,
	`rankedAttemptKey` varchar(64),
	`mode` enum('ranked','practice') NOT NULL,
	`status` enum('active','completed','expired') NOT NULL DEFAULT 'active',
	`questionIndex` int NOT NULL DEFAULT 0,
	`score` int NOT NULL DEFAULT 0,
	`correctAnswers` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`questionStartedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`prizeEligible` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quizAttempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `quizAttempts_attemptToken_unique` UNIQUE(`attemptToken`),
	CONSTRAINT `quizAttempts_rankedAttemptKey_unique` UNIQUE(`rankedAttemptKey`)
);
--> statement-breakpoint
CREATE TABLE `quizWinners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dailyQuizId` int NOT NULL,
	`scoreId` int NOT NULL,
	`prizeTier` enum('first','second','third') NOT NULL,
	`displayName` varchar(80) NOT NULL,
	`status` enum('pending_review','verified','notified','awarded','disqualified') NOT NULL DEFAULT 'pending_review',
	`verificationNotes` text,
	`verifiedAt` timestamp,
	`notifiedAt` timestamp,
	`awardedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quizWinners_id` PRIMARY KEY(`id`),
	CONSTRAINT `quizWinners_scoreId_unique` UNIQUE(`scoreId`),
	CONSTRAINT `secure_quiz_winner_tier_daily_unique` UNIQUE(`dailyQuizId`,`prizeTier`)
);
--> statement-breakpoint
ALTER TABLE `dailyQuizQuestions` ADD CONSTRAINT `dailyQuizQuestions_dailyQuizId_dailyQuizzes_id_fk` FOREIGN KEY (`dailyQuizId`) REFERENCES `dailyQuizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dailyQuizScores` ADD CONSTRAINT `dailyQuizScores_dailyQuizId_dailyQuizzes_id_fk` FOREIGN KEY (`dailyQuizId`) REFERENCES `dailyQuizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dailyQuizScores` ADD CONSTRAINT `dailyQuizScores_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dailyQuizScores` ADD CONSTRAINT `dailyQuizScores_attemptId_quizAttempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `quizAttempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAnalyticsEvents` ADD CONSTRAINT `quizAnalyticsEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAnswers` ADD CONSTRAINT `quizAnswers_attemptId_quizAttempts_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `quizAttempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAnswers` ADD CONSTRAINT `quizAnswers_questionId_dailyQuizQuestions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `dailyQuizQuestions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_dailyQuizId_dailyQuizzes_id_fk` FOREIGN KEY (`dailyQuizId`) REFERENCES `dailyQuizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizWinners` ADD CONSTRAINT `quizWinners_dailyQuizId_dailyQuizzes_id_fk` FOREIGN KEY (`dailyQuizId`) REFERENCES `dailyQuizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizWinners` ADD CONSTRAINT `quizWinners_scoreId_dailyQuizScores_id_fk` FOREIGN KEY (`scoreId`) REFERENCES `dailyQuizScores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_quiz_question_daily_idx` ON `dailyQuizQuestions` (`dailyQuizId`);--> statement-breakpoint
CREATE INDEX `secure_quiz_score_daily_idx` ON `dailyQuizScores` (`dailyQuizId`);--> statement-breakpoint
CREATE INDEX `secure_quiz_score_user_idx` ON `dailyQuizScores` (`userId`);--> statement-breakpoint
CREATE INDEX `secure_quiz_analytics_event_idx` ON `quizAnalyticsEvents` (`eventName`);--> statement-breakpoint
CREATE INDEX `secure_quiz_analytics_created_idx` ON `quizAnalyticsEvents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `secure_quiz_answer_attempt_idx` ON `quizAnswers` (`attemptId`);--> statement-breakpoint
CREATE INDEX `secure_quiz_attempt_daily_idx` ON `quizAttempts` (`dailyQuizId`);--> statement-breakpoint
CREATE INDEX `secure_quiz_attempt_user_idx` ON `quizAttempts` (`userId`);--> statement-breakpoint
CREATE INDEX `secure_quiz_winner_daily_idx` ON `quizWinners` (`dailyQuizId`);