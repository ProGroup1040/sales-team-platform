# Release-gate audit — 2026-10-18

## Scope and evidence baseline

Repository: `ProGroup1040/sales-team-platform`  
Baseline commit: `b69558b1c55394ec1514b9360d3c9db2e52395e3`  
Baseline commit URL: https://github.com/ProGroup1040/sales-team-platform/commit/b69558b1c55394ec1514b9360d3c9db2e52395e3

This is an evidence ledger, not a declaration that production is healthy. A repository inspection cannot substitute for the deployed database's schema, server-side exception, migration ledger, or deployed revision.

## Confirmed from repository

### Financial monthly-report failure

The browser error provided for October 1–31, 2026 contains this aggregation over `payments`:

- `YEAR(paymentDate)`
- `MONTH(paymentDate)`
- `COALESCE(SUM(amount), 0)`
- `COUNT(*)`
- `paymentDate >= startDate AND paymentDate <= endDate`

At the inspected commit, `server/db.ts` implements this aggregation inside `getCollectionPeriodAnalysis(startDate, endDate)`. The tRPC procedure is `financial.periodAnalysis` in `server/routers.ts`, and it calls this helper after financial-manager and `collections` all-scope checks.

The ORM declaration in `drizzle/schema.ts` defines `payments.amount` as `DECIMAL(14,2)` and `payments.paymentDate` as a non-null date column.

**Not confirmed:** the actual production `SHOW CREATE TABLE payments`, the original MySQL error code/message, and whether the deployment is running the inspected commit. The browser's `TRPCClientError` and HTTP 500 do not identify the database root cause. Do not change the query or schema based on guesswork.

Use [the read-only diagnostic SQL](./sql/release-gate-financial-migration-diagnostics.sql) and collect the server-side MySQL `code`, `errno`, `sqlState`, message, and stack for the same request. Redact credentials and customer/financial row data.

### Migration 0074 — collections uniqueness

`drizzle/0074_collections_one_contract_per_deal.sql` adds a unique constraint on `collections.dealId`. This will fail if existing non-null deal IDs have duplicates. Run the duplicate preflight in the diagnostic SQL against a safe database clone before applying it to a legacy database. Do not delete, merge, or reassign financial records automatically.

### Migration 0075 — legacy sales column

`drizzle/0075_reconcile_legacy_sales_schema.sql` renames `sales.finalAmount` to `sales.netAmount` only when the former exists and the latter does not. If both or neither exist, the current conditional branch executes `SELECT 1`; that does not prove the schema is valid. This is a verified fail-open behavior in the migration logic.

Before hardening this migration, verify both fresh-install and legacy-upgrade states against disposable MySQL databases and confirm the supported MySQL/migration-runner behavior for explicit aborts. Do not merge a migration-only change that has not been exercised in both paths.

## CI evidence

The GitHub Actions workflow `.github/workflows/ci.yml` is configured to provision MySQL 8.4, run Drizzle migrations, type-check, start the server for readiness checks, run Vitest, and build production assets.

A successful CI run is useful evidence for that run's tested commit and fixture database only. It does not prove that the production database has the same schema or that the deployed revision matches `main`. Confirm the exact run SHA and results before using CI as a release gate.

## Release gates — status

| Gate | Status | Required evidence |
|---|---|---|
| Exact MySQL error for financial report | BLOCKED | Server log for the failing request with MySQL error metadata |
| Production `payments` schema vs ORM/migrations | BLOCKED | Redacted `SHOW CREATE TABLE` and column metadata from deployed DB |
| October 2026 aggregation regression tests | NOT VERIFIED | Tests reproducing first/last day and empty results against supported MySQL |
| Migration 0074 duplicate preflight | NOT VERIFIED | Duplicate query on legacy DB clone and fresh install |
| Migration 0075 both/neither column states | ISSUE CONFIRMED IN SOURCE | Disposable-DB tests and an explicit, tested fail-closed migration strategy |
| Own/all cross-user access across reads, writes, reports, exports, aggregates | NOT VERIFIED | Adversarial integration tests for every relevant endpoint |
| Exact CI status for release SHA | NOT VERIFIED HERE | Run URL, tested SHA, all job conclusions |
| Deployed revision and applied migrations | BLOCKED | Deployment revision/health metadata and migration ledger from target environment |

## Safe execution order

1. Capture the production-side MySQL exception and schema metadata using read-only access.
2. Reproduce the report query against a sanitized clone with the same schema/version.
3. Fix the demonstrated root cause narrowly; add a regression test for October boundaries and empty results.
4. Test migration 0074 and 0075 on fresh and legacy clones, including duplicate and both/neither-column states.
5. Run cross-user authorization tests for direct IDs, writes, exports, reports, and aggregate endpoints.
6. Run the repository CI workflow and record the exact commit SHA and run URL.
7. Deploy through the approved deployment process, verify the running SHA and migration ledger, then re-test the failing report.

No production data, financial policy, historical records, commission rules, or access policy should be altered as a diagnostic shortcut.
