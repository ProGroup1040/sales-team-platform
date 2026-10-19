ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('soft_delete','restore','accounting_month_changed') NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `performedRole` varchar(64);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `oldValue` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `newValue` text;