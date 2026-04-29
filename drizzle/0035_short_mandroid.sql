ALTER TABLE `daily_tasks` MODIFY COLUMN `taskType` enum('design_2d','design_3d','render','quotation','meeting_modeling','meeting_presentation','meeting_closing','contract','work_order','meeting_2d','meeting_3d','meeting_quotation','closing','negotiation','other') DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `goalType` enum('design_2d','design_3d','render','quotation','meeting','closing','contract','work_order');--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `actualHours` float;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `completionDate` date;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `clientName` varchar(120);--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `dealId` int;