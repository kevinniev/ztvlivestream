CREATE TABLE `creator_payout_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`amount` float NOT NULL,
	`method` enum('paypal','bank_transfer','check') NOT NULL DEFAULT 'paypal',
	`paymentDetails` text,
	`status` enum('pending','processing','paid','rejected') NOT NULL DEFAULT 'pending',
	`notes` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `creator_payout_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_revenue_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`videoId` int,
	`eventType` enum('ad_view','subscription_share','ppv','bonus') NOT NULL,
	`grossAmount` float NOT NULL,
	`creatorShare` float NOT NULL,
	`platformShare` float NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
	`periodStart` bigint,
	`periodEnd` bigint,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creator_revenue_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `videos` ADD `likeCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `creatorId` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `status` enum('pending','approved','rejected','live') DEFAULT 'approved' NOT NULL;