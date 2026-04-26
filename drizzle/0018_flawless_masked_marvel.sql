ALTER TABLE `daily_tasks` ADD `startTime` varchar(5);--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `endTime` varchar(5);--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `taskType` enum('meeting_2d','meeting_3d','meeting_quotation','meeting_closing','design_3d','design_2d','quotation','negotiation','other') DEFAULT 'other';