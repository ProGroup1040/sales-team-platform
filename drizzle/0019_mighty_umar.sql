ALTER TABLE `daily_tasks` MODIFY COLUMN `taskType` enum('meeting_presentation','meeting_closing','meeting_2d','meeting_3d','meeting_quotation','design_2d','design_3d','render','quotation','closing','negotiation','other') DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `engineer_targets` ADD `targetDeals` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `engineer_targets` ADD `targetMeetings` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `engineer_targets` ADD `targetDesigns` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `engineer_targets` ADD `targetClosings` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `engineer_targets` ADD `targetQuotations` int DEFAULT 0;