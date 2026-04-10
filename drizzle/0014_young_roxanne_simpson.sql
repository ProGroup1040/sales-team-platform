ALTER TABLE `engineers` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `engineers` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `engineers` ADD CONSTRAINT `engineers_username_unique` UNIQUE(`username`);