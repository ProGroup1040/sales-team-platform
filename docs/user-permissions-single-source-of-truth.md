# User permissions as the single source of operational access

## Decision

`user_permissions` is the only source of effective module and CRUD grants. A role does not grant operational access by itself. A missing permission row is a denial. The role and section tables are retained for compatibility and security administration, but they are not consulted to resolve operational module grants.

## Current implementation on `main`

- `server/permissionResolution.ts` resolves explicit per-user rows only and normalizes CRUD flags to exactly `0` or `1`.
- `server/db.ts` creates explicit all-denied, `own`-scope rows for every module in the existing user-permission template when a new account is created. This is also used by the test-only in-memory store.
- `server/routers.ts` returns only the signed-in account's explicit grants from `auth.myPermissions`; it no longer merges role grants or synthesizes access for administrators without direct operational grants.
- `server/_core/trpc.ts` applies a centralized module/action check to protected and admin procedures. Unknown operational namespaces fail closed. Queries/subscriptions require `canView`; all 101 mutations in mapped operational namespaces have explicit action requirements, and unclassified mutations fail closed. Operations that can create or modify data require both `canAdd` and `canEdit`.
- Account-management procedures retain their dedicated role/target checks. Role/section permission configuration is restricted to admin/manager roles and does not grant operational access. Push-subscription operations derive ownership from the authenticated actor.
- `client/src/pages/PermissionsPanel.tsx` no longer presents role/section matrices as a way to grant operational access. Individual grants are edited from User Management.
- `drizzle/0072_user_permissions_single_source_of_truth.sql` backfills existing users before the resolver is deployed. Existing per-user rows take precedence. Legacy `deals` is normalized to `closing`; a `team` scope is narrowed to `own` rather than widening visibility. Existing admins receive missing legacy-equivalent module grants while explicit rows are preserved. This broad admin backfill requires an explicit release decision and a pre-deployment impact report.
- `drizzle/0073_user_permissions_unique_module.sql` consolidates duplicate rows conservatively, canonicalizes the legacy module alias, and adds uniqueness for `(userId, module)`.
- Tests cover default-deny account creation, conservative duplicate permission resolution, explicit router/action inventory, tRPC middleware denials for missing grants and insufficient actions, `own`-scope helper behavior, and database-backed lead/deal filtering. These tests do not yet prove every route has correct record-level scope.

## Static API inventory

A source scan of `server/routers.ts` on the baseline revision found 34 router namespaces and 302 declared procedures: 280+ protected/admin operations plus intentionally public authentication/session operations. The centralized authorization mapping is:

| Router namespace(s) | Permission module |
|---|---|
| `engineers`, `tasks`, `projectTimeline`, `meetingReview`, `adminSalesTasks`, `workDist`, `session` | `tasks` |
| `leads`, `leadDailyStats`, `leadFollowup`, `customers` | `crm` |
| `visits` | `visits` |
| `closing`, `dealTasks`, `pipeline`, `sales` | `closing` |
| `kpi`, `promotion` | `kpi` |
| `planning` | `planning` |
| `collections`, `financial` | `collections` |
| `products`, `playbook` | `pricing_system` |
| `management`, `reports`, `funnel` | `reports` |
| `softDelete` | Entity-specific mapping to `crm`, `visits`, `closing`, or `tasks` |
| `seed` | Admin/manager role gate |
| `appUsers` | Dedicated user-management and target-role checks |
| `rolePermissions`, `sectionPermissions` | Admin/manager role gate; no operational grant |
| `auth`, `localAuth` | Authentication/session flows |
| `pushNotifications` | Authenticated actor owns their subscription |

## Validation status and remaining risk

The repository connection does not provide a local shell/database runtime, so a local `pnpm check` / `pnpm test` run has **not** been completed here. GitHub Actions CI run 39117951960 passed on the implementation tree: migrations on disposable MySQL 8.4, TypeScript validation, runtime readiness, 489 tests across 50 files, and production build. The run includes the middleware and task-review ownership regression tests. CI emitted a non-blocking warning that `OAUTH_SERVER_URL` is not configured; confirm production configuration if OAuth is enabled.

The module/action gate is centralized, but it does **not** automatically inject `dataScope` into every database query. Existing per-endpoint ownership checks remain important, and every read/update/delete that accepts an engineer, record, or team identifier still requires an explicit data-scope review. In particular, report aggregates, task/visit/closing/financial queries, and cross-module procedures need adversarial tests for own-vs-all scope. On `feat/authorization-security-audit`, all 101 operational mutations in mapped namespaces have explicit action requirements; unclassified mutations fail closed, and the static route-inventory test enforces mapping coverage. See [Authorization Mutation Permission Matrix](./authorization-mutation-matrix.md) and [Authorization Security Audit — 2026-10-18](./authorization-security-audit-2026-10-18.md). The choices still require handler/business review, and CI has not yet been confirmed.

## Deployment sequence

1. Review and back up the production database.
2. Apply `0072_user_permissions_single_source_of_truth.sql` and then `0073_user_permissions_unique_module.sql` in migration order before deploying the matching application version.
3. Run the full CI validation: migrations on disposable MySQL, `pnpm check`, `pnpm test`, runtime readiness, and production build.
4. Review CI failures and verify existing role-to-user backfill counts against a database snapshot.
5. Validate own/all data-scope behavior endpoint by endpoint before production rollout.
6. The source-of-truth implementation and migrations 0072/0073 are already present in the reviewed `main` baseline. The follow-up work on `feat/authorization-security-audit` is a separate review branch and must not be merged until the audit acceptance criteria pass.
