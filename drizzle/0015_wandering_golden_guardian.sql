CREATE TABLE `studio_background_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`backgroundKey` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studio_background_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_background_favorite_unique` UNIQUE(`userId`,`backgroundKey`)
);
--> statement-breakpoint
CREATE INDEX `studio_background_favorite_user_idx` ON `studio_background_favorites` (`userId`);