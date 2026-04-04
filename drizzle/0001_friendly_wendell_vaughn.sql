CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`company` varchar(255),
	`city` varchar(100),
	`country` varchar(100) DEFAULT 'Saudi Arabia',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`totalPurchases` decimal(15,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(100),
	`category` varchar(100),
	`price` decimal(15,2) NOT NULL,
	`cost` decimal(15,2),
	`stock` int NOT NULL DEFAULT 0,
	`minStock` int DEFAULT 10,
	`unit` varchar(50) DEFAULT 'piece',
	`description` text,
	`status` enum('active','inactive','out_of_stock') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(15,2) NOT NULL,
	`totalPrice` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(50) NOT NULL,
	`customerId` int NOT NULL,
	`totalAmount` decimal(15,2) NOT NULL,
	`discount` decimal(15,2) DEFAULT '0',
	`tax` decimal(15,2) DEFAULT '0',
	`netAmount` decimal(15,2) NOT NULL,
	`status` enum('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
	`notes` text,
	`saleDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
