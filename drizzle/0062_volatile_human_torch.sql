ALTER TABLE `app_users` ADD `sessionVersion` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `engineers` ADD `sessionVersion` int DEFAULT 1 NOT NULL;