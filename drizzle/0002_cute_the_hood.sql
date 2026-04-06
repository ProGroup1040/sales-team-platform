CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int,
	`clientName` varchar(120) NOT NULL,
	`contractAmount` decimal(14,2) NOT NULL,
	`collectedAmount` decimal(14,2) DEFAULT '0',
	`dueDate` date,
	`status` enum('on_track','due_soon','overdue','completed') NOT NULL DEFAULT 'on_track',
	`lastPaymentAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commission_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minAchievementPct` float NOT NULL,
	`maxAchievementPct` float,
	`commissionPct` float NOT NULL,
	`label` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commission_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`taskDate` date NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`plannedHours` float DEFAULT 1,
	`status` enum('planned','completed','delayed','not_done','client_delay') NOT NULL DEFAULT 'planned',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`delayDays` int NOT NULL DEFAULT 0,
	`isClientDelay` int NOT NULL DEFAULT 0,
	`rescheduledFromId` int,
	`isRescheduled` int NOT NULL DEFAULT 0,
	`isCritical` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int,
	`leadId` int,
	`engineerId` int NOT NULL,
	`clientName` varchar(120) NOT NULL,
	`value` decimal(14,2) NOT NULL,
	`stage` enum('proposal','negotiation','contract_sent','closed_won','closed_lost') NOT NULL DEFAULT 'proposal',
	`nextAction` text,
	`nextActionDate` date,
	`closedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minSales` decimal(14,2) NOT NULL,
	`maxSales` decimal(14,2),
	`maxDiscountPct` float NOT NULL,
	`label` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discount_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `engineer_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`targetAmount` decimal(14,2) NOT NULL,
	`manpower` float NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `engineer_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `engineers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320),
	`phone` varchar(30),
	`department` varchar(80),
	`role` enum('admin','engineer') NOT NULL DEFAULT 'engineer',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `engineers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(30),
	`email` varchar(320),
	`source` enum('website','referral','social_media','call','walk_in','other') NOT NULL DEFAULT 'other',
	`assignedEngineerId` int,
	`status` enum('new','contacted','qualified','unqualified','converted') NOT NULL DEFAULT 'new',
	`firstContactAt` timestamp,
	`responseTimeMinutes` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`targetAmount` decimal(14,2) NOT NULL,
	`avgDealValue` decimal(14,2) DEFAULT '50000',
	`closingRate` float DEFAULT 0.3,
	`visitToClosingRate` float DEFAULT 0.4,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthly_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int,
	`engineerId` int NOT NULL,
	`clientName` varchar(120) NOT NULL,
	`clientPhone` varchar(30),
	`address` text,
	`scheduledAt` timestamp NOT NULL,
	`actualAt` timestamp,
	`assignedDelay` int NOT NULL DEFAULT 0,
	`confirmationStatus` enum('confirmed_same_day','confirmed_late','not_confirmed') NOT NULL DEFAULT 'not_confirmed',
	`confirmedAt` timestamp,
	`confirmationDelayHours` int NOT NULL DEFAULT 0,
	`status` enum('scheduled','completed','delayed','cancelled','rescheduled') NOT NULL DEFAULT 'scheduled',
	`delayMinutes` int DEFAULT 0,
	`rescheduledFromId` int,
	`uploadStatus` enum('uploaded_same_day','uploaded_late','not_uploaded') NOT NULL DEFAULT 'not_uploaded',
	`uploadedAt` timestamp,
	`deliveredToAdmin` int NOT NULL DEFAULT 0,
	`deliveryDelayHours` int NOT NULL DEFAULT 0,
	`quality` enum('successful','with_issues','design_rejected','repeated','pending') NOT NULL DEFAULT 'pending',
	`groupStatus` enum('created_on_time','created_late','not_created') NOT NULL DEFAULT 'not_created',
	`assignedToDesigner` int NOT NULL DEFAULT 0,
	`feeAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`feeCollected` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` DROP INDEX `products_sku_unique`;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `name` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `company` varchar(120);--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `status` enum('active','inactive','prospect') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `sku` varchar(80);--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `category` varchar(80);--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `price` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `cost` decimal(12,2);--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `stock` int;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `unit` varchar(30) DEFAULT 'قطعة';--> statement-breakpoint
ALTER TABLE `sale_items` MODIFY COLUMN `unitPrice` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_items` MODIFY COLUMN `totalPrice` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` MODIFY COLUMN `totalAmount` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` MODIFY COLUMN `discount` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `sales` MODIFY COLUMN `tax` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `sales` MODIFY COLUMN `status` enum('pending','processing','delivered','cancelled','returned') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `customers` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `finalAmount` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` DROP COLUMN `city`;--> statement-breakpoint
ALTER TABLE `customers` DROP COLUMN `country`;--> statement-breakpoint
ALTER TABLE `customers` DROP COLUMN `totalPurchases`;--> statement-breakpoint
ALTER TABLE `sale_items` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `sales` DROP COLUMN `netAmount`;--> statement-breakpoint
ALTER TABLE `sales` DROP COLUMN `saleDate`;