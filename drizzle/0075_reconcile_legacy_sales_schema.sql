-- Align the historical sales table with the current ORM mapping without losing data.
-- Fresh installations still have `finalAmount` from migration 0002; deployed legacy
-- databases already have `netAmount`, so the operation must be idempotent.
-- Fail closed before any DDL when a required table is missing or the amount columns
-- are ambiguous. A migration retry must not silently bless an unknown schema.
SET @has_sales_table := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND TABLE_TYPE = 'BASE TABLE'
);
--> statement-breakpoint
SET @has_customers_table := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND TABLE_TYPE = 'BASE TABLE'
);
--> statement-breakpoint
SET @has_final_amount := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'finalAmount'
);
--> statement-breakpoint
SET @has_net_amount := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'netAmount'
);
--> statement-breakpoint
SET @sales_schema_guard_sql := IF(
  @has_sales_table = 1 AND @has_customers_table = 1
    AND @has_final_amount + @has_net_amount = 1,
  'SELECT 1',
  'SELECT * FROM `__migration_0075_invalid_sales_schema_state__`'
);
--> statement-breakpoint
PREPARE sales_schema_guard_statement FROM @sales_schema_guard_sql;
--> statement-breakpoint
EXECUTE sales_schema_guard_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_schema_guard_statement;
--> statement-breakpoint
SET @sales_amount_sql := IF(
  @has_final_amount = 1 AND @has_net_amount = 0,
  'ALTER TABLE `sales` RENAME COLUMN `finalAmount` TO `netAmount`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sales_amount_statement FROM @sales_amount_sql;
--> statement-breakpoint
EXECUTE sales_amount_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_amount_statement;
--> statement-breakpoint
-- The legacy deployed customers table predates the `notes` column in the ORM schema.
SET @has_customer_notes := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'notes'
);
--> statement-breakpoint
SET @customer_notes_sql := IF(
  @has_customer_notes = 0,
  'ALTER TABLE `customers` ADD COLUMN `notes` text',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE customer_notes_statement FROM @customer_notes_sql;
--> statement-breakpoint
EXECUTE customer_notes_statement;
--> statement-breakpoint
DEALLOCATE PREPARE customer_notes_statement;
