ALTER TABLE `projects` ADD `closingStatus` varchar(64);--> statement-breakpoint
ALTER TABLE `projects` ADD `closingOtherDescription` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `closingNotes` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `closedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `projects` ADD `closedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `previousStageBeforeClose` varchar(64);--> statement-breakpoint
ALTER TABLE `projects` ADD `previousStatusBeforeClose` varchar(32);