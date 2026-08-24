CREATE TABLE IF NOT EXISTS `engineers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(320),
  `phone` varchar(30),
  `department` varchar(80),
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `engineers_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `daily_tasks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `engineerId` int NOT NULL,
  `taskDate` date NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `plannedHours` float DEFAULT 1,
  `status` enum('planned','completed','delayed','not_done') NOT NULL DEFAULT 'planned',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `completedAt` timestamp,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `daily_tasks_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `leads` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(120) NOT NULL,
  `phone` varchar(30),
  `email` varchar(320),
  `source` enum('website','referral','social_media','call','walk_in','other') NOT NULL DEFAULT 'other',
  `assignedEngineerId` int,
  `status` enum('new','contacted','qualified','unqualified','converted') NOT NULL DEFAULT 'new',
  `firstContactAt` timestamp,
  `responseTimeMinutes` int,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `visits` (
  `id` int AUTO_INCREMENT NOT NULL,
  `leadId` int,
  `engineerId` int NOT NULL,
  `clientName` varchar(120) NOT NULL,
  `clientPhone` varchar(30),
  `address` text,
  `scheduledAt` timestamp NOT NULL,
  `actualAt` timestamp,
  `status` enum('scheduled','completed','delayed','cancelled') NOT NULL DEFAULT 'scheduled',
  `quality` enum('successful','with_issues','rejected','repeated'),
  `delayMinutes` int DEFAULT 0,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `deals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `visitId` int,
  `leadId` int,
  `engineerId` int NOT NULL,
  `clientName` varchar(120) NOT NULL,
  `value` decimal(14,2) NOT NULL,
  `stage` enum('proposal','negotiation','contract_sent','closed_won','closed_lost') NOT NULL DEFAULT 'proposal',
  `nextAction` text,
  `nextActionDate` date,
  `closedAt` timestamp,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `monthly_targets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `targetAmount` decimal(14,2) NOT NULL,
  `avgDealValue` decimal(14,2) DEFAULT 50000,
  `closingRate` float DEFAULT 0.3,
  `visitToClosingRate` float DEFAULT 0.4,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `monthly_targets_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `collections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `dealId` int,
  `clientName` varchar(120) NOT NULL,
  `contractAmount` decimal(14,2) NOT NULL,
  `collectedAmount` decimal(14,2) DEFAULT 0,
  `dueDate` date,
  `status` enum('on_track','due_soon','overdue','completed') NOT NULL DEFAULT 'on_track',
  `lastPaymentAt` timestamp,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
