CREATE TABLE `admin_sales_meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`weekStartDate` date NOT NULL,
	`weeklyTeamMeeting` enum('done','not_done','pending') NOT NULL DEFAULT 'pending',
	`managementMeeting` enum('done','not_done','pending') NOT NULL DEFAULT 'pending',
	`reportSubmitted` enum('yes','no','pending') NOT NULL DEFAULT 'pending',
	`meetingNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_sales_meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_sales_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`taskType` enum('daily','weekly','monthly','meeting') NOT NULL,
	`taskKey` varchar(80) NOT NULL,
	`taskTitle` varchar(255) NOT NULL,
	`taskDate` date NOT NULL,
	`dayOfWeek` int,
	`dayOfMonth` int,
	`status` enum('pending','done','delayed','not_done') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_sales_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `engineers` MODIFY COLUMN `role` enum('admin','engineer','admin_sales') NOT NULL DEFAULT 'engineer';