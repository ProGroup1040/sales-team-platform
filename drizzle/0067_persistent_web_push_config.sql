CREATE TABLE `web_push_config` (
  `id` int NOT NULL,
  `publicKey` varchar(255) NOT NULL,
  `privateKey` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `web_push_config_id` PRIMARY KEY(`id`)
);
