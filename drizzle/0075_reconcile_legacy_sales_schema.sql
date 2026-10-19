-- Reconcile the historical sales schema without silently accepting an unexpected state.
-- Drizzle executes each migration statement as one MySQL query. The procedure
-- therefore keeps the conditional DDL in one server-side statement.
CREATE PROCEDURE `reconcile_legacy_sales_schema`()
BEGIN
  DECLARE has_sales_table INT DEFAULT 0;
  DECLARE has_final_amount INT DEFAULT 0;
  DECLARE has_net_amount INT DEFAULT 0;
  DECLARE has_customer_notes INT DEFAULT 0;

  SELECT COUNT(*) INTO has_sales_table
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sales';

  IF has_sales_table = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration 0075: sales table is missing';
  END IF;

  SELECT COUNT(*) INTO has_final_amount
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sales'
    AND COLUMN_NAME = 'finalAmount';

  SELECT COUNT(*) INTO has_net_amount
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sales'
    AND COLUMN_NAME = 'netAmount';

  IF has_final_amount = 1 AND has_net_amount = 0 THEN
    SET @sales_amount_sql = 'ALTER TABLE `sales` RENAME COLUMN `finalAmount` TO `netAmount`';
    PREPARE sales_amount_statement FROM @sales_amount_sql;
    EXECUTE sales_amount_statement;
    DEALLOCATE PREPARE sales_amount_statement;
  ELSEIF has_final_amount = 1 AND has_net_amount = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration 0075: sales has both finalAmount and netAmount';
  ELSEIF has_final_amount = 0 AND has_net_amount = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration 0075: sales has neither finalAmount nor netAmount';
  END IF;

  SELECT COUNT(*) INTO has_customer_notes
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customers'
    AND COLUMN_NAME = 'notes';

  IF has_customer_notes = 0 THEN
    SET @customer_notes_sql = 'ALTER TABLE `customers` ADD COLUMN `notes` text';
    PREPARE customer_notes_statement FROM @customer_notes_sql;
    EXECUTE customer_notes_statement;
    DEALLOCATE PREPARE customer_notes_statement;
  END IF;
END;
--> statement-breakpoint
CALL `reconcile_legacy_sales_schema`();
--> statement-breakpoint
DROP PROCEDURE `reconcile_legacy_sales_schema`;
