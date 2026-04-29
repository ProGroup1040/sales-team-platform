CREATE TABLE `company_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`revenueTarget` decimal(14,2) NOT NULL,
	`avgDealValue` decimal(14,2) NOT NULL,
	`closingRateTarget` decimal(5,2) NOT NULL DEFAULT '60',
	`periodFrom` date,
	`periodTo` date,
	`requiredDeals` int,
	`requiredVisits` int,
	`requiredPipelineValue` decimal(14,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `engineer_personal_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`objective` varchar(255) NOT NULL,
	`developmentArea` enum('closing','negotiation','render_quality','presentation','design_quality','client_communication','time_management','other') NOT NULL DEFAULT 'other',
	`evaluationMethod` enum('meeting_review','design_review','render_review','manager_review','self_review') NOT NULL DEFAULT 'manager_review',
	`reviewerRole` enum('admin','manager') NOT NULL DEFAULT 'manager',
	`score` int,
	`reviewNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `engineer_personal_goals_id` PRIMARY KEY(`id`)
);
