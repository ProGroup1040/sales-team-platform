ALTER TABLE `daily_tasks` MODIFY COLUMN `taskType` enum('design_2d','design_3d','render','quotation','meeting_modeling','meeting_presentation','meeting_closing','meeting_2d','meeting_3d','meeting_quotation','closing','negotiation','other') DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `admin_sales_tasks` ADD `category` enum('crm_data','financial_collection','operations','reporting','coordination');--> statement-breakpoint
ALTER TABLE `admin_sales_tasks` ADD `kpiWeight` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `admin_sales_tasks` ADD `kpiImpact` varchar(100);