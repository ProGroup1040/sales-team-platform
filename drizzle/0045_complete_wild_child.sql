CREATE TABLE `deal_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`engineerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`status` enum('pending','done','overdue') NOT NULL DEFAULT 'pending',
	`delayDays` int NOT NULL DEFAULT 0,
	`createdBy` varchar(128),
	`clientName` varchar(255),
	`dealStage` varchar(64),
	`loggedToTimeline` int NOT NULL DEFAULT 0,
	CONSTRAINT `deal_tasks_id` PRIMARY KEY(`id`)
);
