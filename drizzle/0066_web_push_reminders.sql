CREATE TABLE `push_subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `endpoint` varchar(2048) NOT NULL,
  `endpointHash` varchar(64) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `userAgent` varchar(512),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastUsedAt` timestamp,
  CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
  CONSTRAINT `push_subscriptions_user_endpoint_idx` UNIQUE(`userId`,`endpointHash`)
);
--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `kind` varchar(80) NOT NULL,
  `deliveryDate` date NOT NULL,
  `sentAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `notification_deliveries_id` PRIMARY KEY(`id`),
  CONSTRAINT `notification_deliveries_user_kind_day_idx` UNIQUE(`userId`,`kind`,`deliveryDate`)
);
--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_id_idx` ON `push_subscriptions` (`userId`);
--> statement-breakpoint
CREATE INDEX `notification_deliveries_user_id_idx` ON `notification_deliveries` (`userId`);
