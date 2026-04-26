CREATE TABLE `meeting_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`quotationId` int,
	`dealId` int,
	`clientName` varchar(255),
	`sessionType` enum('presentation','closing','follow_up') DEFAULT 'presentation',
	`startTime` timestamp NOT NULL DEFAULT (now()),
	`endTime` timestamp,
	`durationMinutes` int,
	`recordingLink` varchar(500),
	`totalScore` int DEFAULT 0,
	`itemsViewed` int DEFAULT 0,
	`itemsTotal` int DEFAULT 0,
	`videosPlayed` int DEFAULT 0,
	`scriptsUsed` int DEFAULT 0,
	`rendersViewed` int DEFAULT 0,
	`pricesViewed` int DEFAULT 0,
	`status` enum('active','completed','abandoned') DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`itemId` int,
	`actionType` enum('item_opened','video_started','video_completed','render_viewed','script_opened','script_read','price_viewed','quotation_opened','item_completed','item_skipped') NOT NULL,
	`durationSeconds` int DEFAULT 0,
	`metadata` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_actions_id` PRIMARY KEY(`id`)
);
