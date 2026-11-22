ALTER TABLE `leads`
  ADD COLUMN `phoneNormalized` varchar(32) NULL,
  ADD COLUMN `whatsappId` varchar(160) NULL,
  ADD COLUMN `whatsappUsername` varchar(128) NULL,
  ADD COLUMN `whatsappContact` varchar(180) NULL,
  ADD COLUMN `lastMessage` text NULL,
  ADD COLUMN `lastSeen` timestamp NULL,
  ADD COLUMN `clientAddress` text NULL,
  ADD COLUMN `clientPayment` varchar(120) NULL,
  ADD COLUMN `clientDay` varchar(80) NULL,
  ADD COLUMN `kitchenSize` varchar(120) NULL,
  ADD COLUMN `kitchenModel` varchar(160) NULL;
--> statement-breakpoint
UPDATE `leads` SET `phoneNormalized` = REGEXP_REPLACE(`phone`, '[^0-9]', '') WHERE `phone` IS NOT NULL AND `phoneNormalized` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_whatsapp_id_unique` ON `leads` (`whatsappId`);
--> statement-breakpoint
CREATE INDEX `leads_phone_normalized_idx` ON `leads` (`phoneNormalized`);
--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD COLUMN `leadId` int NULL;
--> statement-breakpoint
CREATE INDEX `daily_tasks_lead_id_idx` ON `daily_tasks` (`leadId`);