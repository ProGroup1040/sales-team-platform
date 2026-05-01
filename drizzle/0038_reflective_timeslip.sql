CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` varchar(64) NOT NULL,
	`module` varchar(64) NOT NULL,
	`canView` int NOT NULL DEFAULT 0,
	`canAdd` int NOT NULL DEFAULT 0,
	`canEdit` int NOT NULL DEFAULT 0,
	`canDelete` int NOT NULL DEFAULT 0,
	`dataScope` enum('own','team','all') NOT NULL DEFAULT 'own',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
