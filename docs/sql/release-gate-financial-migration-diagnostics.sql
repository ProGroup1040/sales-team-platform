-- Read-only diagnostics for the financial monthly-report 500 and migration release gates.
-- Run against the DEPLOYED database using a read-only account. Do not paste customer rows or secrets into tickets.
-- Record server/version, column metadata, index metadata, migration markers, and the exact SQL error separately.

SELECT DATABASE() AS database_name, VERSION() AS mysql_version, @@sql_mode AS sql_mode;

-- Compare deployed payments columns with drizzle/schema.ts.
SHOW CREATE TABLE `payments`;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payments'
ORDER BY ORDINAL_POSITION;

-- Verify the date column's actual type and whether October 2026 data exists.
SELECT DATA_TYPE, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payments'
  AND COLUMN_NAME IN ('paymentDate', 'amount');

SELECT COUNT(*) AS october_payment_count,
       MIN(`paymentDate`) AS first_payment_date,
       MAX(`paymentDate`) AS last_payment_date
FROM `payments`
WHERE `paymentDate` >= '2026-10-01'
  AND `paymentDate` < '2026-11-01';

-- Reproduce the aggregation using DATE literals and a half-open month range.
-- This is a diagnostic query only; do not change application semantics until the root cause is confirmed.
SELECT YEAR(`paymentDate`) AS payment_year,
       MONTH(`paymentDate`) AS payment_month,
       COALESCE(SUM(`amount`), 0) AS total_amount,
       COUNT(*) AS payment_count
FROM `payments`
WHERE `paymentDate` >= '2026-10-01'
  AND `paymentDate` < '2026-11-01'
GROUP BY YEAR(`paymentDate`), MONTH(`paymentDate`)
ORDER BY YEAR(`paymentDate`), MONTH(`paymentDate`);

-- Migration 0074 preflight: any returned row is a duplicate that must be investigated before adding UNIQUE(dealId).
SELECT `dealId`, COUNT(*) AS row_count
FROM `collections`
WHERE `dealId` IS NOT NULL
GROUP BY `dealId`
HAVING COUNT(*) > 1
ORDER BY row_count DESC, `dealId`;

-- Migration 0075 schema-state preflight. Expected post-migration state: finalAmount=0, netAmount=1.
SELECT
  SUM(CASE WHEN COLUMN_NAME = 'finalAmount' THEN 1 ELSE 0 END) AS has_final_amount,
  SUM(CASE WHEN COLUMN_NAME = 'netAmount' THEN 1 ELSE 0 END) AS has_net_amount
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sales'
  AND COLUMN_NAME IN ('finalAmount', 'netAmount');

-- Unique-index state for collections.dealId.
SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'collections'
  AND COLUMN_NAME = 'dealId'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Find migration ledger table names without assuming a schema-specific migration-table layout.
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND (TABLE_NAME LIKE '%drizzle%migration%' OR TABLE_NAME LIKE '%migration%')
ORDER BY TABLE_NAME;

-- IMPORTANT:
-- The browser TRPCClientError is not the original MySQL error. Capture the server-side
-- errno, code, sqlState, and stack for the same request, with bind values/customer data redacted.
