# Authorization Security Audit — 2026-10-18

## Status

- **Scope:** static review of the user-permission source-of-truth implementation on the repository's `main` baseline at commit `2cd8564bc88101d455ae531aa3e35e4c4173c34c`.
- **Working branch:** `feat/authorization-security-audit`.
- **Follow-up implementation on this branch:** the 101 operational mutations found in the mapped namespaces now have explicit action requirements; unclassified mutations fail closed. The source inventory test checks this coverage. See [mutation permission matrix](./authorization-mutation-matrix.md).
- **Outcome:** CI run [39121582510](https://github.com/ProGroup1040/sales-team-platform/actions/runs/39121582510) passed migrations, TypeScript, runtime readiness, **504 tests across 52 files**, and production build. The next consolidated revision adds direct-ID financial scope tests and requires final CI before merge. Authorization is not certified production-ready until remaining cross-user coverage and deployment sign-off gates are closed.
- **Execution evidence (2026-10-18):** the last code-changing consolidated revision `b9537b3037eb8cc2fbf14cc9d94651f517e0eaae` passed GitHub Actions [CI run 39119539820](https://github.com/ProGroup1040/sales-team-platform/actions/runs/39119539820). The workflow applied the full migration chain to disposable MySQL 8.4, passed TypeScript validation, passed runtime readiness, passed **494 tests across 50 test files**, and completed the production build. This run includes the middleware tests for missing permission rows, read-only mutation attempts, edit-only delete attempts, combined add/edit grants, and the task-review ownership regression tests. An earlier run failed with 16 tests because legacy session-admin fixtures had no `user_permissions` rows and two integration fixtures read MySQL insert IDs incorrectly; those were corrected and the later runs passed. The CI log still emits a non-blocking `OAUTH_SERVER_URL is not configured` warning; confirm that the deployed environment sets this value if OAuth is enabled. No local shell run is claimed; the successful evidence is GitHub Actions.
- **Additional adversarial middleware tests:** `server/authorization-middleware.test.ts` exercises the real tRPC permission middleware for missing grants, view-only mutation attempts, edit-only delete attempts, and operations requiring both `canAdd` and `canEdit`; these tests passed in CI run 39121582510.

## Repository inventory

A source scan of `server/routers.ts` found 34 router namespaces and 302 declared procedure entries. Counts below are source-level procedure declarations, not proof that each route has been dynamically exercised.

| Router namespace | Declared procedures | Intended authorization boundary |
|---|---:|---|
| `auth` | 2 | Authentication/session flow |
| `seed` | 3 | Admin/manager role gate |
| `engineers` | 2 | `tasks` module |
| `tasks` | 26 | `tasks` module |
| `leads` | 4 | `crm` module |
| `visits` | 12 | `visits` module |
| `closing` | 22 | `closing` module |
| `projectTimeline` | 15 | `tasks` module |
| `sales` | 12 | `closing` module |
| `kpi` | 31 | `kpi` module |
| `collections` | 4 | `collections` module |
| `planning` | 17 | `planning` module |
| `financial` | 25 | `collections` module |
| `customers` | 4 | `crm` module |
| `products` | 5 | `pricing_system` module |
| `management` | 1 | `reports` module |
| `meetingReview` | 4 | `tasks` module |
| `adminSalesTasks` | 7 | `tasks` module |
| `leadFollowup` | 5 | `crm` module |
| `softDelete` | 6 | Entity-specific module mapping |
| `pushNotifications` | 3 | Authenticated actor owns subscription |
| `localAuth` | 4 | Authentication/session flow |
| `leadDailyStats` | 3 | `crm` module |
| `workDist` | 7 | `tasks` module |
| `reports` | 3 | `reports` module |
| `pipeline` | 5 | `closing` module |
| `playbook` | 14 | `pricing_system` module |
| `session` | 8 | `tasks` module |
| `promotion` | 11 | `kpi` module |
| `funnel` | 3 | `reports` module |
| `appUsers` | 16 | Dedicated account/target-role checks |
| `rolePermissions` | 5 | Admin/manager role gate; configuration only |
| `sectionPermissions` | 7 | Admin/manager role gate; configuration only |
| `dealTasks` | 6 | `closing` module |
| **Total** | **302** | Includes public authentication/session procedures |

The route-to-module mapping is centralized in `server/_core/trpc.ts`. Unknown operational namespaces are intended to fail closed. The namespaces exempted from generic operational CRUD checks must keep their own explicit boundary and dedicated tests.

## Findings

### AUTHZ-001 — Record-level `own/all` scope is not centrally enforced

**Severity: High — verification gap with potential horizontal-access impact**

`requireOperationalPermission` resolves the user's module permission and checks only the requested CRUD flag. It does not apply `dataScope` to database reads or mutations. The permission resolver normalizes `dataScope`, but that alone does not constrain a query.

**Implementation added on this branch (partial coverage, not a blanket guarantee)**

- Added a shared `scopedEngineerId` helper that overrides caller-supplied engineer IDs for `own` scope and unit tests for own/all behavior.
- Added server-side ownership guards for record-level visits, leads, deals, deal tasks, project timeline records, financial collection records, meeting sessions, playbook quotations, and Admin Sales tasks/meeting records.
- Scoped selected CRM customer/lead statistics, follow-up aggregates, deal discount summaries, lead/deal lists and stats, and engineer-level coaching/review queries.
- Restricted the soft-delete audit-log endpoint to privileged users with an explicit all-scope grant.
- Added database-backed ownership tests for lead and deal list/aggregate filters, plus direct-ID visit update/delete integration tests proving an own-scope caller cannot modify another engineer’s visit. Static regression tests now require all-scope checks on sensitive team-wide KPI, distribution, and report aggregates. These tests increase coverage but do not yet dynamically exercise every record-scoped route.

This is still a partial endpoint-by-endpoint implementation. Routes accepting task, lead, visit, deal, collection, quotation, engineer, or user IDs must be checked against their actual data ownership relationships; static string scans are not sufficient to certify the entire API.

**Required remediation**
1. Inventory every query/mutation that accepts an engineer ID, user ID, task/lead/visit/deal/collection ID, team filter, or other record selector.
2. Verify ownership is derived from the authenticated actor where appropriate, rather than trusted from caller-supplied input.
3. For `own` scope, add server-side predicates to reads, aggregates, exports, updates, deletes, and record-specific actions; do not rely on UI filtering.
4. For `all` scope, allow broader access only when the user's explicit module grant allows it.
5. Add adversarial integration tests using at least two users and records owned by different engineers. Test both direct record IDs and aggregate/report endpoints.
6. Do not deploy the scope guarantee until each endpoint has a tested outcome or a documented, approved exemption.

A generic middleware cannot safely add SQL filters to arbitrary business queries without endpoint metadata; do not implement a blanket rewrite that guesses table ownership.

### AUTHZ-002 — Mutation permission classification relied on name heuristics

**Severity: High — remediation implemented and validated by CI; business-semantic review remains open**

The `main` baseline used regular expressions on mutation names and silently defaulted unclassified mutations to `canEdit`. That behavior is removed on this branch. All 101 mutations in the mapped operational namespaces now have explicit requirements; unclassified operational mutations are denied. Upsert/synchronization routes that may create or modify data require both `canAdd` and `canEdit`. The route-inventory test checks that each operational mutation has a mapping, and [authorization-mutation-matrix.md](./authorization-mutation-matrix.md) documents the current entries.

**Still required**
1. Run CI to validate the source-inventory test and permission unit tests.
2. Review every entry against its handler and business semantics, especially financial, approval, cancellation, synchronization, and upsert operations.
3. Add targeted middleware integration tests that prove each grant combination is enforced at runtime.

The mapping is explicit but still requires a business/security review; explicitness alone does not prove every action choice is correct.

### AUTHZ-003 — Test-only authorization bypass can mask middleware failures

**Severity: Medium — test design risk**

The prior implementation in `server/_core/trpc.ts` and `getOperationalScopeAccess` contained broad `NODE_ENV === "test"` compatibility bypasses for admin/manager actors. Those bypasses have been removed. Legacy business-logic tests now seed explicit per-user grants for their fixture actor, while the dedicated authorization middleware suite asserts that legacy admin/manager actors without explicit grants are denied.

**Validation**
- The bypasses have been removed and legacy business-logic tests seed explicit per-user grants rather than skipping authorization.
- Regression tests cover legacy admin/manager denial by default, missing permission rows, view-only mutation attempts, and edit-only delete attempts.
- The explicit-grant fixtures and default-deny regression tests passed in CI run 39121582510.

### AUTHZ-004 — Migration 0072 intentionally backfills broad admin grants

**Severity: Medium — business/security approval required**

`drizzle/0072_user_permissions_single_source_of_truth.sql` materializes the pre-existing legacy `admin` role default (all CRUD, `all` scope) only for missing per-user module rows. Existing explicit user rows, including denials, are preserved. Role rows that collapse from legacy `deals` to canonical `closing` now intersect CRUD grants and scope rather than unioning them. This is a behavior-preserving migration of the historical super-admin policy, not a new default for newly created accounts; the impact must still be reviewed against a production snapshot before deployment.

**Required remediation**
- Review and explicitly approve the documented legacy super-admin policy before deployment.
- Before deployment, run a read-only report against a production snapshot showing affected admin accounts and missing modules; do not infer this report from CI fixtures.
- Regression fixtures now assert that existing explicit rows are preserved and that legacy `deals`/`closing` and duplicate grants merge by intersection rather than union.
- Keep a rollback/restore plan and never test migrations directly against production.

### AUTHZ-005 — Database migration and schema correctness still need execution evidence

**Severity: High — release gate**

The current baseline includes migrations 0072 and 0073, and the Drizzle journal records both. Static inspection cannot prove the migrations apply cleanly to an empty MySQL database or upgrade a representative existing database. Migration 0073 deduplicates rows, canonicalizes `deals` to `closing`, then adds uniqueness for `(userId, module)`.

**Implementation and validation**
- The existing CI workflow applies the full migration chain against a fresh MySQL 8.4 database.
- `server/permission-migrations.test.ts` now runs the actual 0072/0073 SQL in a separate disposable MySQL database with duplicate modules, both `deals` and `closing`, explicit denials, and mixed data scopes.
- The fixture asserts preserved user rows, conservative intersections, removal of the legacy module alias, uniqueness, and no widened grants. It passed in CI run 39121582510.

### AUTHZ-007 — Task-linked meeting reviews could trust a client-supplied engineer ID

**Severity: High — patched on this branch; CI validation passed; endpoint coverage remains partial**

The `meetingReview.upsertReview` mutation verified that the caller could edit the referenced task, but then passed the separately supplied `engineerId` to the review upsert helper. An authorized caller could therefore attempt to attribute a review for an in-scope task to a different engineer. The promotion review route already checked this relationship; the regular meeting review route did not.

**Remediation on this branch**

- Load the task's engineer ID from `dailyTasks` after task authorization.
- Compare the requested engineer ID against the database-owned task relationship and reject mismatches with `BAD_REQUEST`.
- Pass the database-derived engineer ID to the upsert helper instead of trusting the client field.
- Share the assertion with the promotion review route and add unit coverage for matching and mismatching IDs.

**Validation status:** the regression tests passed on consolidated CI run 39119539820. The endpoint-level `own/all` coverage remains partial.

### AUTHZ-008 — Engineer directory scope and engineer creation guard

**Severity: High — implementation added; CI validation passed; full record-level scope audit remains open**

The top-level `engineers.list` route previously returned the full engineer directory after only a module-level `canView` check. It now resolves the authenticated caller’s `tasks` scope and returns only the linked engineer for `own` scope; `all` scope is required to enumerate the team. An own-scope actor without a linked engineer is denied. Unit tests cover both scopes and the unlinked case.

The `engineers.create` route also now calls the dedicated user-management authorization guard before creating an engineer. A source-inventory regression test asserts this guard remains present.

**Validation status:** these follow-up changes passed CI run 39119539820; the full record-level scope audit remains open.

### AUTHZ-006 — The existing implementation document contained stale branch/deployment statements

**Severity: Low — corrected on this branch**

The prior document said the authorization branch had not merged to `main`, although the source-of-truth changes and migrations were already present in the current `main` baseline. This branch updates the document to distinguish the merged baseline from the follow-up audit branch and lists migrations 0072 and 0073 in order. CI still needs to verify the deployment sequence.

## Existing controls confirmed by static inspection

- Operational module grants are read from `user_permissions`; the role/section tables are not used by `resolveUserPermissions` to synthesize runtime module grants.
- Missing module grants fail closed at the module/CRUD check.
- `deals` is canonicalized to `closing` in the permission resolver and permission write/read helpers.
- Migration 0073 attempts to collapse duplicate rows conservatively before adding a unique constraint.
- Account-management routes in `appUsers` contain dedicated caller/target-role checks; these checks need targeted negative tests.
- Push subscription writes derive the user ID from the authenticated actor and unsubscribe filters by both user ID and endpoint hash.
- The current CI workflow is configured to install dependencies, apply migrations, run type checks and tests, verify runtime readiness, and build on pull requests targeting `main`.

These are static findings only, not runtime validation.

## Acceptance criteria before calling this production-ready

- [ ] All 34 router namespaces have an explicit documented boundary: mapped module/action, public authentication, or dedicated exemption with tests.
- [x] Source mapping explicitly classifies all 101 operational mutations and denies unclassified operational mutations; static inventory test passed in CI.
- [ ] Review each action requirement against handler behavior and business policy.
- [ ] Every record-scoped endpoint is reviewed and tested for `own/all`; caller-supplied IDs cannot bypass ownership.
- [x] The `engineers.list` scope filtering and `engineers.create` management guard pass CI run 39119539820.
- [x] tRPC middleware tests pass for missing permission rows, read-only mutation attempts, edit-only delete attempts, and operations requiring both grants; task-linked review ownership regression tests pass in CI run 39119539820.
- [ ] Add broader adversarial integration tests for cross-user task/session records and privileged account changes; direct-ID visit and financial record tests plus static aggregate guards are now present.
- [x] Migrations 0072 and 0073 pass on fresh MySQL and the disposable upgrade fixture without broadening duplicate/canonical grants; CI run 39121582510 passed both.
- [x] TypeScript validation, `pnpm test` (**504 tests across 52 files**), `pnpm build`, migration step, and runtime readiness passed in GitHub Actions run 39121582510.
- [ ] The administrator backfill policy has explicit product/security approval and a reviewed pre-deployment impact report.
- [ ] Deployment/rollback instructions and this audit's final evidence are current.

## Next implementation sequence

1. Keep the canonical permissions document, mutation matrix, and this audit report synchronized.
2. Review all explicit action choices against handlers and confirm upsert/bulk/sync semantics with the product owner.
3. Implement and test record-level scope enforcement endpoint-by-endpoint, prioritizing financial, closing, CRM, tasks, visits, and report aggregates.
4. Add disposable MySQL migration fixtures for duplicate grants, canonical module merging, and no-access-broadening semantics; the current green CI validates the migration chain on a fresh disposable database, not representative upgrade fixtures.
5. Request review and merge only after the acceptance criteria above are met.
