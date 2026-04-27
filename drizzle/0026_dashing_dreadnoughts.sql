ALTER TABLE `deals` ADD `grossValue` decimal(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `netValue` decimal(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `sourceTaskId` int;--> statement-breakpoint
ALTER TABLE `deals` ADD `isAutoCreated` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `isLocked` int DEFAULT 0 NOT NULL;