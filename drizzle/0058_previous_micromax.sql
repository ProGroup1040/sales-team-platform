CREATE TABLE `financial_cash_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asOfDate` date NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`notes` text,
	`updatedBy` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_cash_balances_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_cash_balances_asOfDate_unique` UNIQUE(`asOfDate`)
);
--> statement-breakpoint
CREATE TABLE `financial_cash_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`direction` enum('inflow','outflow') NOT NULL,
	`sourceType` enum('payment','commitment','manual_adjustment') NOT NULL,
	`sourceId` int,
	`amount` decimal(14,2) NOT NULL,
	`effectiveDate` date NOT NULL,
	`description` varchar(255) NOT NULL,
	`notes` text,
	`createdBy` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_cash_movements_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_cash_movements_source_unique` UNIQUE(`sourceType`,`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `financial_commitments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`collectionId` int,
	`dealId` int,
	`description` varchar(255) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`dueDate` date NOT NULL,
	`status` enum('reserved','paid','cancelled') NOT NULL DEFAULT 'reserved',
	`settledAt` timestamp,
	`notes` text,
	`createdBy` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_commitments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payment_promises` ADD `isConfirmed` tinyint DEFAULT 0 NOT NULL;