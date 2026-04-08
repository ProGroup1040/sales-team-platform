CREATE TABLE `admin_kpi_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`scoreDate` date NOT NULL,
	`weekNumber` int,
	`tasksDistributed` int NOT NULL DEFAULT 0,
	`tasksFollowedUp` int NOT NULL DEFAULT 0,
	`teamPerformanceReviewed` int NOT NULL DEFAULT 0,
	`operationsScore` decimal(5,2) NOT NULL DEFAULT '0',
	`crmUpdatedDaily` int NOT NULL DEFAULT 0,
	`responseTimeMonitored` int NOT NULL DEFAULT 0,
	`teamActivityMonitored` int NOT NULL DEFAULT 0,
	`crmScore` decimal(5,2) NOT NULL DEFAULT '0',
	`collectionsFollowedUp` int NOT NULL DEFAULT 0,
	`promisesFollowedUp` int NOT NULL DEFAULT 0,
	`overdueReduced` int NOT NULL DEFAULT 0,
	`collectionsScore` decimal(5,2) NOT NULL DEFAULT '0',
	`targetReviewed` int NOT NULL DEFAULT 0,
	`actualVsTargetChecked` int NOT NULL DEFAULT 0,
	`targetScore` decimal(5,2) NOT NULL DEFAULT '0',
	`finalKpiScore` decimal(5,2) NOT NULL DEFAULT '0',
	`isWeeklyReview` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_kpi_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `engineers` MODIFY COLUMN `role` enum('admin','engineer','admin_sales') NOT NULL DEFAULT 'engineer';