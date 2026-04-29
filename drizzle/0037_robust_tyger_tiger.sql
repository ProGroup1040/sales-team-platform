CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('login','logout','create','update','delete','view','export','permission_change') NOT NULL,
	`module` varchar(50),
	`recordId` int,
	`details` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('sales_engineer','sales_specialist','admin_sales','manager') NOT NULL DEFAULT 'sales_engineer',
	`engineerId` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`lastLoginAt` timestamp,
	`resetToken` varchar(255),
	`resetTokenExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`module` enum('crm','visits','deals','kpi','planning','discounts','reports','tasks','collections','users') NOT NULL,
	`canView` int NOT NULL DEFAULT 1,
	`canAdd` int NOT NULL DEFAULT 0,
	`canEdit` int NOT NULL DEFAULT 0,
	`canDelete` int NOT NULL DEFAULT 0,
	`dataScope` enum('own','all') NOT NULL DEFAULT 'own',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`)
);
