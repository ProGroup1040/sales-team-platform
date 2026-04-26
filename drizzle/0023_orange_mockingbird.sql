CREATE TABLE `engineer_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineerId` int NOT NULL,
	`evaluationMonth` int NOT NULL,
	`evaluationYear` int NOT NULL,
	`salesAchievementScore` int NOT NULL DEFAULT 0,
	`closingRateScore` int NOT NULL DEFAULT 0,
	`meetingScore` int NOT NULL DEFAULT 0,
	`playbookUsageScore` int NOT NULL DEFAULT 0,
	`distributionScore` int NOT NULL DEFAULT 0,
	`overallScore` int NOT NULL DEFAULT 0,
	`performanceLevel` enum('a_player','b_player','c_player') NOT NULL DEFAULT 'b_player',
	`decisionAction` enum('promote','bonus','coaching','warning','improvement_plan','firing_risk','none') NOT NULL DEFAULT 'none',
	`consecutiveCMonths` int NOT NULL DEFAULT 0,
	`firingDecisionTriggered` boolean NOT NULL DEFAULT false,
	`coachingNotes` text,
	`improvementPlan` text,
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `engineer_evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `meeting_reviews` ADD `playbookUsageScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_reviews` ADD `presentationQualityScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_reviews` ADD `controlScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_reviews` ADD `closingAttemptScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_reviews` ADD `decisionTag` enum('strong','needs_improvement','weak') DEFAULT 'needs_improvement' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_reviews` ADD `strengthPoint` text;--> statement-breakpoint
ALTER TABLE `meeting_reviews` ADD `improvementPoint` text;