-- Align the historical sales table with the current ORM mapping without losing data.
-- Fresh installations still have `finalAmount` from migration 0002; deployed legacy
-- databases already have `netAmount`, so the operation must be idempotent.
SET @has_final_amount := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'finalAmount'
);
SET @has_net_amount := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'netAmount'
);
SET @sales_amount_sql := IF(
  @has_final_amount = 1 AND @has_net_amount = 0,
  'ALTER TABLE `sales` RENAME COLUMN `finalAmount` TO `netAmount`',
  'SELECT 1'
);
PREPARE sales_amount_statement FROM @sales_amount_sql;
EXECUTE sales_amount_statement;
DEALLOCATE PREPARE sales_amount_statement;
--> statement-breakpoint
-- The legacy deployed customers table predates the `notes` column in the ORM schema.
SET @has_customer_notes := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'notes'
);
SET @customer_notes_sql := IF(
  @has_customer_notes = 0,
  'ALTER TABLE `customers` ADD COLUMN `notes` text',
  'SELECT 1'
);
PREPARE customer_notes_statement FROM @customer_notes_sql;
EXECUTE customer_notes_statement;
DEALLOCATE PREPARE customer_notes_statement;
