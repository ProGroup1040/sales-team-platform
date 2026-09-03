ALTER TABLE `payments` ADD `paymentPromiseId` int;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_paymentPromiseId_unique` UNIQUE(`paymentPromiseId`);