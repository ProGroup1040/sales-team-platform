CREATE TABLE `design_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`weekStart` date NOT NULL,
	`designQuality` float NOT NULL DEFAULT 0,
	`revisionCount` int NOT NULL DEFAULT 0,
	`executionSpeed` float NOT NULL DEFAULT 0,
	`meetingNotes` text,
	`reviewedBy` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `design_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incentive_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minKpiPct` float NOT NULL,
	`maxKpiPct` float,
	`incentiveAmount` decimal(14,2) NOT NULL,
	`label` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `incentive_tiers_id` PRIMARY KEY(`id`)
);
