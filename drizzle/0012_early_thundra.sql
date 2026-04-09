ALTER TABLE `visits` MODIFY COLUMN `deleteReason` enum('client_cancelled','postponed','data_entry_error','other');--> statement-breakpoint
ALTER TABLE `visits` ADD `deleteReasonCustom` varchar(255);--> statement-breakpoint
ALTER TABLE `visits` ADD `deletedBy` varchar(120);