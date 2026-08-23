ALTER TABLE `project_movements` ADD `previousResponsibleId` int;--> statement-breakpoint
ALTER TABLE `project_movements` ADD `newResponsibleId` int;--> statement-breakpoint
ALTER TABLE `project_movements` ADD `assignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `project_movements` ADD `assignedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `projects` ADD `preExecutionStatus` varchar(96) DEFAULT 'waiting_site_readiness' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `preExecutionWaitingOwnerCode` varchar(64) DEFAULT 'client';--> statement-breakpoint
ALTER TABLE `projects` ADD `preExecutionWaitingReasonCode` varchar(96) DEFAULT 'site_not_ready';--> statement-breakpoint
ALTER TABLE `projects` ADD `preExecutionNotes` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `expectedSiteReadyDate` date;--> statement-breakpoint
ALTER TABLE `projects` ADD `siteReadyDate` date;--> statement-breakpoint
ALTER TABLE `projects` ADD `siteReadySource` varchar(64);--> statement-breakpoint
ALTER TABLE `projects` ADD `siteReadyRecordedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `projects` ADD `siteReadyRecordedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `siteReadyNotes` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionSurveyRequestedDate` date;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionSurveyScheduledDate` date;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionSurveyActualDate` date;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionSurveyStatus` varchar(64) DEFAULT 'not_requested' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionSurveyEngineerId` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionSurveyNotes` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionStartDate` date;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionStartApprovedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `projects` ADD `executionStartApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `standardExecutionDays` int DEFAULT 45 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `executionClockStatus` varchar(32) DEFAULT 'not_started' NOT NULL;