ALTER TABLE `deals` ADD `maxDiscountPct` decimal(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `savedDiscountBonus` decimal(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `discountApprovalStatus` enum('none','pending','approved','rejected') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `discountApprovedBy` varchar(120);