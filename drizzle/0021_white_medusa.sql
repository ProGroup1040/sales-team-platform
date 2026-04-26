CREATE TABLE `playbook_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`code` varchar(100),
	`price` decimal(14,2) DEFAULT '0',
	`unit` varchar(50) DEFAULT 'وحدة',
	`description` text,
	`script` text,
	`keyPoints` text,
	`usageLocations` text,
	`alternatives` text,
	`specData` text,
	`imageUrls` text,
	`videoUrl` varchar(500),
	`renderUrl` varchar(500),
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playbook_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playbook_quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int,
	`engineerId` int NOT NULL,
	`clientName` varchar(255),
	`itemsJson` text NOT NULL,
	`totalValue` decimal(14,2) DEFAULT '0',
	`recordingLink` varchar(500),
	`presentationStartedAt` timestamp,
	`presentationEndedAt` timestamp,
	`status` enum('draft','presented','accepted','rejected') DEFAULT 'draft',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playbook_quotations_id` PRIMARY KEY(`id`)
);
