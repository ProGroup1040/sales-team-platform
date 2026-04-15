ALTER TABLE `deals` ADD `discountPercent` decimal(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `discountValue` decimal(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `discountNote` text;