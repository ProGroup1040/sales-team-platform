CREATE TABLE `login_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`windowStartedAt` timestamp NOT NULL DEFAULT (now()),
	`attempts` int NOT NULL DEFAULT 0,
	`blockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `login_rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_rate_limits_key_hash_unique` UNIQUE(`keyHash`)
);
