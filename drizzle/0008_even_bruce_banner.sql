CREATE TABLE `meeting_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`engineerId` int NOT NULL,
	`reviewedBy` int,
	`openingScore` int NOT NULL DEFAULT 0,
	`understandingScore` int NOT NULL DEFAULT 0,
	`presentationScore` int NOT NULL DEFAULT 0,
	`objectionScore` int NOT NULL DEFAULT 0,
	`closingScore` int NOT NULL DEFAULT 0,
	`totalScore` int NOT NULL DEFAULT 0,
	`comments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `category` varchar(80);--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `meetingRecordingLink` varchar(500);--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `recordingSubmittedAt` timestamp;