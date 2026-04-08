CREATE TABLE `lead_followup_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`logDate` date NOT NULL,
	`adminSalesId` int NOT NULL,
	`telesalesId` int NOT NULL,
	`followupStatus` enum('followed_up','delayed','no_response') NOT NULL,
	`responseDelayHours` int,
	`followupQuality` enum('excellent','good','poor'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_followup_logs_id` PRIMARY KEY(`id`)
);
