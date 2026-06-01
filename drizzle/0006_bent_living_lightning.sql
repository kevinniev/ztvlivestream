CREATE TABLE `studio_rundowns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rundownId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`segments` text NOT NULL,
	`totalDurationSeconds` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studio_rundowns_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_rundowns_rundownId_unique` UNIQUE(`rundownId`)
);
--> statement-breakpoint
CREATE TABLE `studio_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`hostUserId` int NOT NULL,
	`title` varchar(255) DEFAULT 'ZTVLIVE Studio Session',
	`status` enum('waiting','live','ended') NOT NULL DEFAULT 'waiting',
	`virtualSetId` varchar(64) DEFAULT 'none',
	`inviteToken` varchar(128) NOT NULL,
	`inviteExpiresAt` bigint,
	`guestName` varchar(128),
	`guestJoinedAt` bigint,
	`startedAt` bigint,
	`endedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studio_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_sessions_sessionId_unique` UNIQUE(`sessionId`),
	CONSTRAINT `studio_sessions_inviteToken_unique` UNIQUE(`inviteToken`)
);
--> statement-breakpoint
CREATE TABLE `studio_stream_destinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('youtube','twitch','ztvlive','custom') NOT NULL,
	`label` varchar(128) NOT NULL,
	`rtmpUrl` varchar(512) NOT NULL,
	`streamKey` varchar(256) NOT NULL,
	`enabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studio_stream_destinations_id` PRIMARY KEY(`id`)
);
