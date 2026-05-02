CREATE TABLE `section_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` varchar(64) NOT NULL,
	`module` varchar(64) NOT NULL,
	`section` varchar(128) NOT NULL,
	`visibility` enum('all','self','hidden') NOT NULL DEFAULT 'all',
	`canEdit` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `section_permissions_id` PRIMARY KEY(`id`)
);
