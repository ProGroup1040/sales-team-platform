-- Bring the deployed legacy `customers` table up to the ORM contract without
-- removing or rewriting existing customer data. Each conditional DDL statement is
-- executed separately because TiDB does not permit ALTER TABLE within procedures.
SET @customer_has_name := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'name');
SET @customer_sql := IF(@customer_has_name = 0, 'ALTER TABLE `customers` ADD COLUMN `name` varchar(120) NOT NULL DEFAULT \'عميل غير مسمى\'', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
--> statement-breakpoint
SET @customer_has_email := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'email');
SET @customer_sql := IF(@customer_has_email = 0, 'ALTER TABLE `customers` ADD COLUMN `email` varchar(320) NULL', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
--> statement-breakpoint
SET @customer_has_phone := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'phone');
SET @customer_sql := IF(@customer_has_phone = 0, 'ALTER TABLE `customers` ADD COLUMN `phone` varchar(30) NULL', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
--> statement-breakpoint
SET @customer_has_company := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'company');
SET @customer_sql := IF(@customer_has_company = 0, 'ALTER TABLE `customers` ADD COLUMN `company` varchar(120) NULL', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
--> statement-breakpoint
SET @customer_has_status := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'status');
SET @customer_sql := IF(@customer_has_status = 0, 'ALTER TABLE `customers` ADD COLUMN `status` enum(\'active\',\'inactive\',\'prospect\') NOT NULL DEFAULT \'active\'', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
--> statement-breakpoint
SET @customer_has_notes := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'notes');
SET @customer_sql := IF(@customer_has_notes = 0, 'ALTER TABLE `customers` ADD COLUMN `notes` text NULL', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
--> statement-breakpoint
SET @customer_has_created_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'createdAt');
SET @customer_sql := IF(@customer_has_created_at = 0, 'ALTER TABLE `customers` ADD COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
--> statement-breakpoint
SET @customer_has_updated_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'updatedAt');
SET @customer_sql := IF(@customer_has_updated_at = 0, 'ALTER TABLE `customers` ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE customer_statement FROM @customer_sql;
EXECUTE customer_statement;
DEALLOCATE PREPARE customer_statement;
