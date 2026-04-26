CREATE TABLE `work_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`logDate` date NOT NULL,
	`activityType` enum('meeting_2d','meeting_quotation','meeting_3d','meeting_closing','design_3d','design_2d','quotation') NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 60,
	`clientName` varchar(255),
	`notes` text,
	`weekNumber` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_logs_id` PRIMARY KEY(`id`)
);
