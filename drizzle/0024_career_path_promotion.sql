CREATE TABLE `engineer_career_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`currentLevel` enum('sales_engineer','senior_sales_engineer','sales_consultant') NOT NULL DEFAULT 'sales_engineer',
	`levelStartDate` timestamp NOT NULL DEFAULT (now()),
	`commissionMultiplier` decimal(4,2) NOT NULL DEFAULT '1.00',
	`maxDiscountPct` decimal(5,2) NOT NULL DEFAULT '5.00',
	`leadsAccessLevel` enum('standard','premium','vip') NOT NULL DEFAULT 'standard',
	`promotionHistory` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `engineer_career_levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `engineer_career_levels_engineerId_unique` UNIQUE(`engineerId`)
);
--> statement-breakpoint
ALTER TABLE `engineer_evaluations` ADD `taskDisciplineScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `engineer_evaluations` ADD `careerLevel` enum('sales_engineer','senior_sales_engineer','sales_consultant') DEFAULT 'sales_engineer' NOT NULL;--> statement-breakpoint
ALTER TABLE `engineer_evaluations` ADD `promotionEligible` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `engineer_evaluations` ADD `promotionReadinessScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `engineer_evaluations` ADD `consecutiveMonthsMeetingTarget` int DEFAULT 0 NOT NULL;
