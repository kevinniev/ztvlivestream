ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `provider` varchar(32) DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `providerId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;