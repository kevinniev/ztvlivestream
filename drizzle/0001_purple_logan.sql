CREATE TABLE `newsletter_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`subscribedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletter_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscribers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`optionA` varchar(255) NOT NULL,
	`optionB` varchar(255) NOT NULL,
	`optionC` varchar(255) NOT NULL,
	`optionD` varchar(255) NOT NULL,
	`correctAnswer` enum('A','B','C','D') NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`pointValue` int NOT NULL DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(128),
	`score` int NOT NULL DEFAULT 0,
	`questionsAnswered` int NOT NULL DEFAULT 0,
	`correctAnswers` int NOT NULL DEFAULT 0,
	`playedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduleItemId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64),
	`thumbnailUrl` text,
	`startTime` bigint NOT NULL,
	`endTime` bigint NOT NULL,
	`isLive` boolean NOT NULL DEFAULT false,
	`youtubeId` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64),
	`scheduledAt` bigint NOT NULL,
	`status` enum('pending','approved','rejected','aired') NOT NULL DEFAULT 'pending',
	`youtubeId` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `upload_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`youtubeId` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`thumbnailUrl` text,
	`category` enum('live','tech','gaming','sports','movies','podcasts','news','music','other') NOT NULL DEFAULT 'other',
	`tags` text,
	`viewCount` int NOT NULL DEFAULT 0,
	`duration` varchar(20),
	`creatorName` varchar(128),
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isLive` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoId` int NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','creator') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','basic','premium','creator_pro') DEFAULT 'free' NOT NULL;