CREATE TABLE `referral_attributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`referredEmailHash` varchar(64) NOT NULL,
	`referralTokenHash` varchar(64) NOT NULL,
	`status` enum('held','eligible_for_manual_review','rejected') NOT NULL DEFAULT 'held',
	`holdReason` enum('program_locked','inactive_link','self_referral_hold','rights_review_required','duplicate_contact_hold','eligible_for_manual_review') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_attributions_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_attribution_partner_contact_unique` UNIQUE(`partnerId`,`referredEmailHash`)
);
--> statement-breakpoint
CREATE TABLE `referral_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`organization` varchar(160),
	`partnerCode` varchar(32) NOT NULL,
	`status` enum('provisional','suspended','closed') NOT NULL DEFAULT 'provisional',
	`verificationStatus` enum('not_started','pending_review','verified','rejected') NOT NULL DEFAULT 'not_started',
	`linkStatus` enum('inactive','active','revoked') NOT NULL DEFAULT 'inactive',
	`enrollmentTokenHash` varchar(64) NOT NULL,
	`linkTokenHash` varchar(64) NOT NULL,
	`termsVersion` varchar(32) NOT NULL DEFAULT 'pending-legal-review',
	`termsAcceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_partner_email_unique` UNIQUE(`email`),
	CONSTRAINT `referral_partner_code_unique` UNIQUE(`partnerCode`),
	CONSTRAINT `referral_partner_enrollment_token_unique` UNIQUE(`enrollmentTokenHash`),
	CONSTRAINT `referral_partner_link_token_unique` UNIQUE(`linkTokenHash`)
);
--> statement-breakpoint
CREATE TABLE `referral_reward_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attributionId` int NOT NULL,
	`status` enum('awaiting_qualification','needs_rights_review','eligible_for_manual_review','approved_non_payment','rejected') NOT NULL DEFAULT 'awaiting_qualification',
	`reviewerNotes` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_reward_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_reward_reviews_attributionId_unique` UNIQUE(`attributionId`)
);
--> statement-breakpoint
ALTER TABLE `referral_attributions` ADD CONSTRAINT `referral_attributions_partnerId_referral_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `referral_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_reward_reviews` ADD CONSTRAINT `referral_reward_reviews_attributionId_referral_attributions_id_fk` FOREIGN KEY (`attributionId`) REFERENCES `referral_attributions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `referral_attribution_status_idx` ON `referral_attributions` (`status`);--> statement-breakpoint
CREATE INDEX `referral_partner_status_idx` ON `referral_partners` (`status`);--> statement-breakpoint
CREATE INDEX `referral_reward_review_status_idx` ON `referral_reward_reviews` (`status`);