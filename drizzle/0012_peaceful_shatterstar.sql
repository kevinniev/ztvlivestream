CREATE TABLE `live_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`streamId` int NOT NULL,
	`userId` int,
	`displayName` varchar(64) NOT NULL,
	`avatarUrl` text,
	`message` text NOT NULL,
	`isCreator` boolean NOT NULL DEFAULT false,
	`isPinned` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `live_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`creatorName` varchar(128),
	`title` varchar(255) NOT NULL,
	`description` text,
	`thumbnailUrl` text,
	`category` enum('live','tech','gaming','sports','movies','podcasts','news','music','other') NOT NULL DEFAULT 'other',
	`status` enum('scheduled','live','ended') NOT NULL DEFAULT 'scheduled',
	`streamKey` varchar(64) NOT NULL,
	`playbackType` enum('youtube','daily','rtmp') NOT NULL DEFAULT 'youtube',
	`playbackId` varchar(255),
	`viewerCount` int NOT NULL DEFAULT 0,
	`peakViewerCount` int NOT NULL DEFAULT 0,
	`chatEnabled` boolean NOT NULL DEFAULT true,
	`scheduledAt` bigint,
	`startedAt` bigint,
	`endedAt` bigint,
	`vodUrl` text,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `live_streams_id` PRIMARY KEY(`id`),
	CONSTRAINT `live_streams_streamKey_unique` UNIQUE(`streamKey`)
);
