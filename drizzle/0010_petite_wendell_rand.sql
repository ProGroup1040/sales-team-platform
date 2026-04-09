ALTER TABLE `visits` ADD `adminSalesId` int;--> statement-breakpoint
ALTER TABLE `visits` ADD `lastUpdatedByAdminAt` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `bookingStatus` enum('booked','distributed','distribution_delayed') DEFAULT 'booked' NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `paymentScreenshotUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `visits` ADD `paymentDate` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `debtFollowedUp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `isDeleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `deleteReason` enum('client_cancelled','postponed','data_entry_error');--> statement-breakpoint
ALTER TABLE `visits` ADD `deletedAt` timestamp;