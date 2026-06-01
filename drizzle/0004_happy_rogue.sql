CREATE TABLE `sms_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`name` varchar(128),
	`source` varchar(64) NOT NULL DEFAULT 'homepage',
	`optedIn` boolean NOT NULL DEFAULT true,
	`subscribedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `sms_subscribers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `smsOptIn` boolean DEFAULT false NOT NULL;