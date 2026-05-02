ALTER TABLE `engineer_targets` ADD `isAutoDistributed` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `engineer_targets` ADD `distributionWeight` decimal(5,4) DEFAULT '1.0000';--> statement-breakpoint
ALTER TABLE `engineer_targets` ADD `targetLeads` int DEFAULT 0;