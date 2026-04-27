CREATE TABLE `deal_timeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`taskId` int,
	`engineerId` int NOT NULL,
	`activityType` enum('deal_created','quotation','meeting_modeling','meeting_presentation','meeting_closing','stage_changed','note_added','won','lost') NOT NULL,
	`description` text,
	`stageFrom` varchar(50),
	`stageTo` varchar(50),
	`grossValue` decimal(14,2),
	`netValue` decimal(14,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deal_timeline_id` PRIMARY KEY(`id`)
);
