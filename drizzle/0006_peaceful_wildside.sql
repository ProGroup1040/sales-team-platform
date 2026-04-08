DROP TABLE `admin_kpi_scores`;--> statement-breakpoint
ALTER TABLE `engineers` MODIFY COLUMN `role` enum('admin','engineer') NOT NULL DEFAULT 'engineer';