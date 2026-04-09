CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('engineer','task','lead','visit','deal') NOT NULL,
	`entityId` int NOT NULL,
	`entityName` varchar(255),
	`action` enum('soft_delete','restore') NOT NULL,
	`reason` enum('data_entry_error','duplicate','client_cancelled','other') NOT NULL,
	`reasonCustom` varchar(255),
	`performedBy` varchar(120),
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `isDeleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `deleteReason` enum('data_entry_error','duplicate','client_cancelled','other');--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `deleteReasonCustom` varchar(255);--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `deletedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `deals` ADD `isDeleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deals` ADD `deleteReason` enum('data_entry_error','duplicate','client_cancelled','other');--> statement-breakpoint
ALTER TABLE `deals` ADD `deleteReasonCustom` varchar(255);--> statement-breakpoint
ALTER TABLE `deals` ADD `deletedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `engineers` ADD `isDeleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `engineers` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `engineers` ADD `deleteReason` enum('data_entry_error','duplicate','client_cancelled','other');--> statement-breakpoint
ALTER TABLE `engineers` ADD `deleteReasonCustom` varchar(255);--> statement-breakpoint
ALTER TABLE `engineers` ADD `deletedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `isDeleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `deleteReason` enum('data_entry_error','duplicate','client_cancelled','other');--> statement-breakpoint
ALTER TABLE `leads` ADD `deleteReasonCustom` varchar(255);--> statement-breakpoint
ALTER TABLE `leads` ADD `deletedBy` varchar(120);