ALTER TABLE `project_updates` ADD `currentStageName` varchar(120);--> statement-breakpoint
ALTER TABLE `project_updates` ADD `currentDepartment` varchar(120);--> statement-breakpoint
ALTER TABLE `project_updates` ADD `currentResponsibleId` int;--> statement-breakpoint
ALTER TABLE `project_updates` ADD `currentResponsibleName` varchar(120);--> statement-breakpoint
ALTER TABLE `project_updates` ADD `salesOwnerId` int;--> statement-breakpoint
ALTER TABLE `project_updates` ADD `salesOwnerName` varchar(120);--> statement-breakpoint
ALTER TABLE `project_updates` ADD `daysInCurrentStage` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_updates` ADD `plannedExitDate` date;--> statement-breakpoint
ALTER TABLE `project_updates` ADD `stageDelayDays` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_updates` ADD `inheritedDelayDays` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_updates` ADD `totalDelayDays` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_updates` ADD `newDelaySinceLastUpdate` int DEFAULT 0 NOT NULL;