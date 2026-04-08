CREATE TABLE `commission_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`engineerId` int NOT NULL,
	`stage` enum('stage1','stage2') NOT NULL,
	`commissionAmount` decimal(14,2) NOT NULL,
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`triggerCondition` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commission_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_promises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`engineerId` int,
	`clientName` varchar(120) NOT NULL,
	`promiseAmount` decimal(14,2) NOT NULL,
	`promiseDate` date NOT NULL,
	`status` enum('pending','paid','overdue') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_promises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`engineerId` int,
	`clientName` varchar(120) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`paymentDate` date NOT NULL,
	`paymentType` enum('initial','installment','final','visit_fee') NOT NULL DEFAULT 'installment',
	`addedBy` enum('engineer','admin') NOT NULL DEFAULT 'admin',
	`receiptNumber` varchar(80),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
