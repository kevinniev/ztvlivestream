CREATE TABLE `social_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('instagram','facebook','twitter','tiktok') NOT NULL,
	`contentType` enum('post','reel','story','thread') NOT NULL DEFAULT 'post',
	`caption` text NOT NULL,
	`mediaUrl` varchar(1024),
	`status` enum('draft','scheduled','published','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`externalPostId` varchar(256),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_posts_id` PRIMARY KEY(`id`)
);
