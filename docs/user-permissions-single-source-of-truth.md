# User permissions as the single source of operational access

## Decision

`user_permissions` is the only source of effective module and CRUD grants. A role does not grant operational access by itself. A missing permission row is a denial. The role and section tables are retained for compatibility and security administration, but they are not consulted to resolve operational module grants.

## Implementation in this branch

- `server/permissionResolution.ts` resolves explicit per-user rows only and normalizes CRUD flags to exactly `0` or `1`.
- `server/db.ts` creates explicit all-denied, `own`-scope rows for every module in the existing user-permission template when a new account is created. This is also used by the test-only in-memory store.
- `server/routers.ts` returns only the signed-in account's explicit grants from `auth.myPermissions`; it no longer merges role grants or synthesizes access for administrators without direct operational grants.
- `server/_core/trpc.ts` applies a centralized module/action check to protected and admin procedures. Unknown operational namespaces fail closed. Reads require `canView`; mutation names indicating creation/logging/import require `canAdd`; delete/remove operations require `canDelete`; other mutations require `canEdit`.
- Account-management procedures retain their dedicated role/target checks. Role/section permission configuration is restricted to admin/manager roles and does not grant operational access. Push-subscription operations derive ownership from the authenticated actor.
- `client/src/pages/PermissionsPanel.tsx` no longer presents role/section matrices as a way to grant operational access. Individual grants are edited from User Management.
- `drizzle/0072_user_permissions_single_source_of_truth.sql` backfills existing users before the new resolver is deployed. Existing per-user rows take precedence. Legacy `deals` is normalized to `closing`; a `team` scope is narrowed to `own` rather than widening visibility. Existing admins receive missing legacy-equivalent module grants while explicit rows are preserved.
- Tests cover default-deny account creation and the user-only resolver.

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

The repository's GitHub connector permits branch writes, but it does not provide a local shell/database runtime. A local `pnpm check` / `pnpm test` run has therefore **not** been completed in this environment. The test changes are committed, but passing tests must not be claimed until CI or a local run confirms them.

The module/action gate is centralized, but it does **not** automatically inject `dataScope` into every database query. Existing per-endpoint ownership checks remain important, and every read/update/delete that accepts an engineer, record, or team identifier still requires an explicit data-scope review. In particular, report aggregates, task/visit/closing/financial queries, and cross-module procedures need adversarial tests for own-vs-all scope. This branch should not be treated as fully production-validated until those tests and CI pass.

## Deployment sequence

1. Review and back up the production database.
2. Apply `0072_user_permissions_single_source_of_truth.sql` before deploying the new resolver.
3. Run `pnpm check` and `pnpm test` in CI.
4. Review CI failures and verify existing role-to-user backfill counts against a database snapshot.
5. Validate own/all data-scope behavior endpoint by endpoint before production rollout.
6. Merge only after review; this branch has not been merged to `main`.
