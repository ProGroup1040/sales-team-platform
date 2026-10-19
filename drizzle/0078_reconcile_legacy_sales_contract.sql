-- Align the deployed legacy `sales` table to the ORM write contract without
-- deleting or reinterpreting historical netAmount values. TiDB-compatible dynamic
-- statements add only missing columns; legacy rows keep their existing IDs.
SET @sales_has_final_amount := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'finalAmount');
--> statement-breakpoint
SET @sales_has_net_amount := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'netAmount');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_final_amount = 1 AND @sales_has_net_amount = 0, 'ALTER TABLE `sales` RENAME COLUMN `finalAmount` TO `netAmount`', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_invoice := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'invoiceNumber');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_invoice = 0, 'ALTER TABLE `sales` ADD COLUMN `invoiceNumber` varchar(50) NOT NULL DEFAULT \'\'', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
UPDATE `sales` SET `invoiceNumber` = CONCAT('LEGACY-', `id`) WHERE `invoiceNumber` IS NULL OR `invoiceNumber` = '';
--> statement-breakpoint
SET @sales_has_invoice_index := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND INDEX_NAME = 'sales_invoice_number_unique');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_invoice_index = 0, 'ALTER TABLE `sales` ADD CONSTRAINT `sales_invoice_number_unique` UNIQUE(`invoiceNumber`)', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_customer_id := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'customerId');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_customer_id = 0, 'ALTER TABLE `sales` ADD COLUMN `customerId` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_total := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'totalAmount');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_total = 0, 'ALTER TABLE `sales` ADD COLUMN `totalAmount` decimal(12,2) NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_discount := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'discount');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_discount = 0, 'ALTER TABLE `sales` ADD COLUMN `discount` decimal(12,2) NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_tax := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'tax');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_tax = 0, 'ALTER TABLE `sales` ADD COLUMN `tax` decimal(12,2) NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_status := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'status');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_status = 0, 'ALTER TABLE `sales` ADD COLUMN `status` enum(\'pending\',\'processing\',\'delivered\',\'cancelled\',\'returned\') NOT NULL DEFAULT \'pending\'', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_payment_status := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'paymentStatus');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_payment_status = 0, 'ALTER TABLE `sales` ADD COLUMN `paymentStatus` enum(\'unpaid\',\'partial\',\'paid\') NOT NULL DEFAULT \'unpaid\'', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_notes := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'notes');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_notes = 0, 'ALTER TABLE `sales` ADD COLUMN `notes` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_created_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'createdAt');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_created_at = 0, 'ALTER TABLE `sales` ADD COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
--> statement-breakpoint
SET @sales_has_updated_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'updatedAt');
--> statement-breakpoint
SET @sales_sql := IF(@sales_has_updated_at = 0, 'ALTER TABLE `sales` ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
--> statement-breakpoint
PREPARE sales_statement FROM @sales_sql;
--> statement-breakpoint
EXECUTE sales_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_statement;
