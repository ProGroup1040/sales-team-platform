CREATE TABLE `lead_daily_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`totalLeads` int NOT NULL DEFAULT 0,
	`contacted` int NOT NULL DEFAULT 0,
	`delayed` int NOT NULL DEFAULT 0,
	`notContacted` int NOT NULL DEFAULT 0,
	`qualified` int NOT NULL DEFAULT 0,
	`converted` int NOT NULL DEFAULT 0,
	`source` varchar(100),
	`notes` text,
	`enteredBy` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_daily_stats_id` PRIMARY KEY(`id`)
);
