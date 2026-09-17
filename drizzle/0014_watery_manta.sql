CREATE TABLE `studio_custom_backgrounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(64) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studio_custom_backgrounds_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_custom_backgrounds_fileKey_unique` UNIQUE(`fileKey`)
);
--> statement-breakpoint
CREATE INDEX `studio_custom_background_user_idx` ON `studio_custom_backgrounds` (`userId`);