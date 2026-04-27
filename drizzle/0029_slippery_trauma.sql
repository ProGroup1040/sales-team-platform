ALTER TABLE `collections` ADD `engineerId` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `receiptUrl` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `nextPaymentDate` date;