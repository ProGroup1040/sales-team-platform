# Release-gate audit — 2026-10-18

## Follow-up execution — 2026-10-19

- PR #8 hardened `drizzle/0075_reconcile_legacy_sales_schema.sql` to fail closed on ambiguous/missing schema states and added forward migration `drizzle/0079_validate_reconciled_sales_schema.sql`. The migration chain and MySQL integration coverage passed CI run [39251429517](https://github.com/ProGroup1040/sales-team-platform/actions/runs/39251429517).
- Authorization hardening and representative MySQL-backed scope regressions were merged through PR #22. The latest fixes cover discount-budget scoping, quotation-to-session links, project precheck side effects, visit-to-lead links, sensitive closing configuration writes, and financial-contract-to-deal links. See the [authorization audit follow-up](./authorization-security-audit-2026-10-18.md).
- CI on disposable MySQL validates migrations, TypeScript, runtime readiness, tests, and production build; it does **not** prove that the deployed production schema/revision matches the repository.
- The production `financial.periodAnalysis` HTTP 500 remains **unresolved and unconfirmed** at the root-cause level. The deployed revision, redacted server-side MySQL error, production `SHOW CREATE TABLE payments`, and migration ledger are still required. No production fix or deployment is claimed here.

---


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

## Follow-up evidence — 2026-10-19

### CI failure reproduced from GitHub Actions

The failed CI run for PR #3 was `39133558274` and checked merge commit `148c910d878c3a5e021f1b3aabfe27591c177f30` (PR head `e7d90611dc6231e27ec07835bb883f66a602d8ed` merged into baseline `b69558b1c55394ec1514b9360d3c9db2e52395e3`). MySQL 8.4 reached healthy status before migrations started. The failure occurred during `pnpm drizzle-kit migrate` in migration `0075_reconcile_legacy_sales_schema.sql` with MySQL `ER_PARSE_ERROR` near `SET @has_net_amount :=`. Therefore the previous migration was not being executed successfully in the CI MySQL 8.4 environment.

### Immutable-migration correction

Migration 0075 was already issued and recorded by the migration journal. It must not be rewritten: environments that already applied it do not rerun its changed text. The later stored-procedure rewrite was therefore reverted. The released migration remains an idempotent reconciliation step for the supported `finalAmount`-only and `netAmount`-only states; its both/neither-state behavior is documented as a legacy-schema release gate, not silently retrofitted through altered historical SQL. Any new reconciliation policy must use a newly numbered migration after clone validation.

### Current release decision

`BLOCKED`. PR #3 remains Draft and must not be merged or deployed. Production access is unavailable in this environment: no deployed server log, redacted `SHOW CREATE TABLE payments`, migration ledger, or deployed revision was provided. The exact production root cause of `financial.periodAnalysis` HTTP 500 is therefore still unconfirmed. Full MySQL integration and cross-user own/all authorization evidence are still required before changing the decision to `READY FOR REVIEW`.

### Final CI evidence for the current branch

GitHub Actions run [39214263310](https://github.com/ProGroup1040/sales-team-platform/actions/runs/39214263310) passed for commit `062f989` (`test: use valid engineer for commission fixture`). The run used MySQL 8.4 and passed database migrations, TypeScript check, runtime `/healthz` and `/readyz` readiness checks, the full Vitest suite, and the production build. This proves the repository fixture database and this exact SHA; it does not prove the production database or deployment revision.

The earlier CI failures were resolved in sequence: migration 0075 parser failure (`39133558274`), invalid deal fixture (`39212703401`), invalid contract fixture (`39214025821`), and invalid commission fixture (the final run above). Foreign keys remained enabled throughout; the tests were corrected to create real engineer fixtures rather than weakening schema enforcement.

### Updated release-gate table

| Gate | Current status | Evidence |
|---|---|---|
| Migration 0075 on fresh MySQL 8.4 | PASSED | CI run `39214263310`, migration step passed |
| Full CI on tested SHA `062f989` | PASSED | [GitHub Actions run](https://github.com/ProGroup1040/sales-team-platform/actions/runs/39214263310) |
| Exact production MySQL error for `financial.periodAnalysis` | BLOCKED | Production server log still required |
| Production `SHOW CREATE TABLE payments` | BLOCKED | Redacted output from affected database still required |
| Migration 0074 duplicate preflight on legacy clone | NOT VERIFIED | Sanitized legacy clone or query result still required |
| Migration 0075 legacy/both/neither state matrix | NOT VERIFIED | Disposable MySQL state-matrix execution still required |
| Cross-user `own/all` integration coverage for all sensitive reads/writes/reports/exports | NOT VERIFIED | Adversarial integration evidence still required |
| Deployed revision and migration ledger | BLOCKED | Target environment metadata still required |

The release decision remains **`BLOCKED`**. PR #3 is still Draft and must not be merged or deployed until the production evidence and remaining legacy/scope gates are supplied and verified.

## Engineering follow-up — 2026-10-19

The following repository-side work was added on the current PR branch and is pending verification by the MySQL 8.4 CI job for the new head:

| Gate | Status | Evidence added |
|---|---|---|
| `financial.periodAnalysis` October 1–31, 2026 boundaries and empty result | FIXED AND TESTED (repository test pending CI database run) | `server/financial-period-analysis.integration.test.ts`; date-only validation and exclusive end-date query in `server/db.ts` and `server/routers.ts` |
| Migration 0074 duplicate `collections.dealId` safety | FIXED AND TESTED (pending CI database run) | `server/release-gate-migrations.integration.test.ts`; duplicate rows are asserted unchanged after the expected failure |
| Migration 0075 released-schema compatibility | TESTED (pending CI database run) | `server/release-gate-migrations.integration.test.ts`; final-only and already-reconciled states are covered without rewriting issued SQL; both/neither remains a clone-review gate for any future numbered migration |
| Legacy `customers` and `sales` write contracts | FIXED AND TESTED (pending CI database run) | New non-destructive migrations 0077/0078, managed-database schema verification, and customer/sale integration tests cover missing columns and non-auto-increment legacy IDs |
| Runtime own/all financial authorization | FIXED AND TESTED (pending CI database run) | Expanded `server/financial-scope.test.ts` with owned-list, direct-ID denial, all-scope manager, and period aggregate assertions |
| Production error, production schema, deployed SHA, and production migration ledger | BLOCKED | Requires read-only evidence from the affected deployment; repository CI cannot establish this |

No production data, credentials, financial records, access policy, or historical values were changed. The release decision remains **`BLOCKED`** until the new MySQL integration tests pass on the exact PR head and the production-only evidence plus required human approval are supplied.

## Exact-head CI result — 2026-10-19

GitHub Actions run [39216970706](https://github.com/ProGroup1040/sales-team-platform/actions/runs/39216970706) passed for commit `2bde9c3a91d04c69a3a348748d0db64246ad9fa7`. It is historical evidence for that exact SHA only. After restoring immutable migration 0075 content, a fresh MySQL 8.4 CI run is required before treating the current branch's migration coverage as verified.

PR #3 remains open and Draft. GitHub reports it as mergeable with a clean merge state and the required CI check green, but no approving review is recorded. The exact production error, redacted production `payments` schema, deployed revision, and production migration ledger remain unavailable; therefore the release decision remains **`BLOCKED`** and no merge was attempted.
