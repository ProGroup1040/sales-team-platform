-- Forward guard for databases where migration 0075 was already recorded.
-- Do not guess how to reconcile both/missing amount columns; stop before further
-- application writes so an operator can inspect and preserve the invoice data.
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
SET @has_customer_notes := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'notes'
);
--> statement-breakpoint
SET @sales_schema_guard_sql := IF(
  @has_sales_table = 1 AND @has_customers_table = 1
    AND @has_final_amount = 0 AND @has_net_amount = 1
    AND @has_customer_notes = 1,
  'SELECT 1',
  'SELECT * FROM `__migration_0079_invalid_sales_schema_state__`'
);
--> statement-breakpoint
PREPARE sales_schema_guard_statement FROM @sales_schema_guard_sql;
--> statement-breakpoint
EXECUTE sales_schema_guard_statement;
--> statement-breakpoint
DEALLOCATE PREPARE sales_schema_guard_statement;
