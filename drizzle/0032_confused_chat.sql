CREATE TABLE `deal_discount_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`engineerId` int NOT NULL,
	`dealValue` decimal(14,2) NOT NULL,
	`allocatedDiscountMax` decimal(14,2) NOT NULL,
	`allocationPct` decimal(5,2) NOT NULL,
	`usedDiscount` decimal(14,2) NOT NULL DEFAULT '0',
	`dealType` enum('pipeline','closed') NOT NULL DEFAULT 'pipeline',
	`lostDueToPricing` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deal_discount_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_bonus_caps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`monthlyCap` decimal(14,2) NOT NULL DEFAULT '15000',
	`earnedBonus` decimal(14,2) NOT NULL DEFAULT '0',
	`isPaid` int NOT NULL DEFAULT 0,
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discount_bonus_caps_id` PRIMARY KEY(`id`)
);
