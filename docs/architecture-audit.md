# Full System Architecture Audit

## 1. Executive Summary

The repository contains a coherent, functioning full-stack architecture: React/Vite in the browser, Wouter routing, tRPC over Express, request-context actor resolution, router procedures, Drizzle ORM, and MySQL persistence. The architecture is **sustainable for the current product scope**, but it is not yet fully maintainable or production-ready without addressing boundary complexity, identity fragmentation, distributed authorization, database failure semantics, and operational gaps.

The most important confirmed risk is in `server/db.ts`: `getDb()` returns `null` when `DATABASE_URL` is absent or connection initialization fails, while some write paths return without throwing. `upsertUser()` is a concrete example (`server/db.ts:73-93`). This can produce a successful-looking authentication callback while the user upsert was not persisted. Many other write functions throw when the database is unavailable, so behavior is inconsistent rather than uniformly unsafe.

No P0 finding is assigned from static evidence alone. P1 findings concern silent write failure, fragmented identity/authentication, and authorization consistency. Transaction coverage is materially present for several financial, permission, and lifecycle operations, but not every multi-write workflow could be proven transactional from the repository evidence.

## 2. Current Architecture

| Layer | Responsibility | Important files | Security boundary | Testing evidence |
|---|---|---|---|---|
| Browser/UI | Routes, forms, tables, dashboards, local UI state, cache invalidation | `client/src/App.tsx`, `client/src/pages/`, `client/src/components/` | UI visibility only; not authoritative authorization | Page/module usage and client-focused tests where present |
| tRPC client | Typed query/mutation calls and React Query integration | `client/src/lib/trpc.ts`, page modules | Sends authenticated requests; does not replace server authorization | Consumer search and module tests |
| Express | HTTP server, middleware, OAuth routes, health/readiness, tRPC adapter | `server/_core/index.ts`, `server/_core/oauth.ts` | HTTP and cookie boundary | `server/_core/*test.ts` |
| Context/auth | Resolves OAuth/user/local/app-user actor | `server/_core/context.ts`, `server/localAuth.ts`, `server/_core/sdk.ts` | Authentication boundary | Auth/logout/runtime tests |
| Procedure guards | Public/protected/admin gating | `server/_core/trpc.ts` | First server authorization gate | Role/permission tests |
| Routers | Input schemas, procedure orchestration, some business logic | `server/routers.ts` | Server API boundary | Broad server test suite |
| Business/data layer | Queries, mutations, aggregations, calculations, transactions | `server/db.ts`, helpers | Data and business boundary | Domain calculation/integration tests |
| ORM/database | Schema, migrations, relational persistence | `drizzle/schema.ts`, `drizzle/*.sql`, `drizzle.config.ts` | Persistence boundary | CI migration step and integration tests |
| External services | OAuth, S3/storage, optional integrations | `server/_core/`, `server/storage.ts` | Outbound service boundary | Partial helper tests; production behavior unknown |

## 3. Component Boundaries

The separation is directionally correct but uneven. `server/routers.ts` contains input validation and orchestration, while `server/db.ts` contains pure data access, aggregations, domain calculations, authorization-adjacent checks, soft-delete behavior, and multi-write transactions. The existing reverse-engineering documentation correctly identifies `server/db.ts` as a large module with substantial business logic.

| `server/db.ts` responsibility class | Audit finding |
|---|---|
| Pure data access | Extensive and confirmed. |
| Business logic | Extensive: lifecycle guards, scoring, financial calculations, and derived statuses occur here. |
| Aggregation/reporting | Extensive: KPI, ranking, trend, dashboard, and financial summaries. |
| Authorization | Some ownership/role-sensitive behavior is mixed into operations; primary guards also exist in routers. |
| Validation | Input/domain validation is distributed between Zod router schemas and db functions. |
| Transaction logic | Confirmed in multiple financial, permission, and lifecycle functions. |
| External integration | Present in supporting server modules; callers must be reviewed per integration. |

No direct frontend-to-database import was established in the inspected source. No definitive circular dependency was proven from static inspection, but the size and cross-domain responsibility of `server/db.ts` create tight coupling and make change impact difficult to predict.

## 4. Request Lifecycle

The actual path is:

```text
React page/component
  → generated tRPC client hook
  → HTTP request to Express/tRPC adapter
  → createContext actor resolution
  → public/protected/admin middleware
  → router input validation and handler
  → server/db.ts or helper
  → Drizzle query/transaction
  → MySQL
  → tRPC response
  → React Query cache/UI state
```

`server/_core/index.ts` registers Express, OAuth, health/readiness, and the tRPC adapter. `server/_core/context.ts` resolves OAuth and cookie-backed actors. `server/_core/trpc.ts` defines procedure guards. `server/routers.ts` defines the typed contract. Error propagation is not uniform: some code throws, some converts to procedure errors, and some returns empty/undefined values.

## 5. Architectural Violations and Risks

The following are confirmed design risks rather than claims that the system is unusable:

1. **God-module concentration.** `server/db.ts` combines persistence, business rules, reporting, validation, authorization-adjacent checks, and transactions across many domains.
2. **Multiple identity models.** `users`, `engineers`, and `appUsers` coexist, and context resolution normalizes them only partially into an actor concept.
3. **Distributed authorization.** Global procedure guards, shared role predicates, stored permission tables, and manual router checks coexist without one generated authoritative matrix.
4. **Inconsistent database-unavailable semantics.** Some writes throw; `upsertUser()` returns silently when no database exists.
5. **Contract discovery cost.** The tRPC surface is large, with approximately 33 namespaces and hundreds of procedures, but no single generated catalog includes all security, transaction, test, and consumer metadata.
6. **Operational incompleteness.** CI is substantial, but deployment automation, rollback, backups, monitoring, rate limiting, and production topology were not evidenced.

## 6. Database Layer Analysis

`getDb()` in `server/db.ts:64-70` lazily initializes Drizzle only when `DATABASE_URL` is present. If initialization throws, it logs a warning and leaves `_db` null. A caller therefore receives no database object rather than a typed infrastructure error.

The impact depends on the caller. Reads commonly return `undefined`, `[]`, or an empty aggregate when no db exists. Some writes explicitly throw `Database not available`; others can return early. Authentication and user-upsert paths deserve special attention because a request may continue after persistence was skipped. The repository intentionally contains a test-only in-memory store for selected app-user paths when `NODE_ENV=test` and no `DATABASE_URL` exists; that exception should not be confused with production persistence.

Representative confirmed transaction usage includes payment/follow-up settlement, user permission replacement, and deal reopening. The presence of transactions is positive, but transaction coverage must be verified per mutation rather than inferred for an entire namespace.

## 7. API Analysis

The primary API is typed tRPC. Router namespaces include `auth`, `localAuth`, `appUsers`, `rolePermissions`, `sectionPermissions`, `leads`, `leadFollowup`, `visits`, `closing`, `sales`, `financial`, `kpi`, `planning`, `promotion`, `projectTimeline`, `tasks`, `reports`, `playbook`, `meetingReview`, `dealTasks`, `softDelete`, and work-distribution areas. Client consumers were found for a large subset of these procedures.

Inputs are generally validated with Zod in `server/routers.ts`; the response/error contract is distributed between thrown errors, tRPC errors, and result objects. This is maintainable at current scale only if new procedures follow documented conventions. A generated API inventory should be treated as a prerequisite for major backend expansion.

## 8. Error Handling

The codebase uses explicit errors, `console.warn`, `console.error`, and fallback values. Empty arrays/objects can be legitimate “no records” results, but in database-unavailable branches they can mask infrastructure failure. OAuth callback failure is logged and returned as an HTTP 500 in `server/_core/oauth.ts`. Database initialization logs a warning in `server/db.ts`.

The main concern is not that errors are never thrown; it is that callers do not share one failure contract. Infrastructure failure should be distinguishable from a valid empty result, especially for financial dashboards, authentication, and writes.

## 9. Frontend/Backend Contract

The frontend module-to-backend relationship is structurally clear: major pages call namespaced tRPC procedures and use React Query state. The architecture includes loading/error UI in many places, but a complete page-by-page audit of optimistic rollback, duplicate requests, dead procedures, and cache invalidation was not proven by static inventory alone. These should be validated from each page’s hooks and mutation callbacks before refactoring.

Known contract risks are duplicated client identity fields, nullable linking IDs, multiple authentication procedures, and dashboard calculations whose business formulas are not centralized in a published glossary. The current reverse-engineering document records the route and procedure landscape; this audit adds the boundary and failure-risk assessment.

## 10. Testing Architecture

The test suite is broad and risk-oriented. Named tests cover environment/runtime behavior, cookies, app users, logout, closing/month calculations, control panel, deal tasks, discounts, financial liquidity/module logic, KPI/commission, lead follow-up/daily stats, lost deals, management focus, money, performance discounts, project timeline/permissions, role permissions, sales, scoring, soft deletes, task calendars/types, user management, and visit KPIs.

Coverage is strongest for deterministic domain calculations and selected integration flows. Static evidence does not establish comprehensive concurrency, retry/idempotency, production-auth integration, migration rollback, external-service failure, or every sensitive procedure’s authorization matrix. Existing `review_artifacts/validation_summary.md` records prior local validation of type check/build and a test environment failure related to required secrets/database variables; this audit did not reinstall dependencies or rerun the suite.

## 11. CI/CD

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`. It starts MySQL 8.4, installs dependencies with a frozen lockfile, applies migrations, runs type checking, starts the server and checks `/healthz` and `/readyz`, runs tests, stops the server, and builds production artifacts.

This is meaningful **CI**, not complete **CD**. No deployment, release promotion, production migration approval, rollback, backup/restore rehearsal, security scanning, or post-deployment monitoring automation was established in the inspected repository. CI’s use of a disposable MySQL service is positive but does not prove production data safety.

## 12. Production Readiness

| Area | Assessment | Evidence-based conclusion |
|---|---|---|
| Security | Needs hardening review | Multiple auth paths and distributed RBAC; no complete threat model or security scan evidence. |
| Reliability | Moderate | Health/readiness and tests exist; database failure semantics are inconsistent. |
| Observability | Partial | Health/readiness and console logs exist; metrics/tracing/alerts are not evidenced. |
| Database safety | Moderate with risks | Migrations and transactions exist; not every write path is proven atomic or fail-fast. |
| Authentication | Functional but fragmented | OAuth/local/app-user paths coexist with different identity records. |
| Authorization | Functional but inconsistent risk | Guards and permissions exist; complete matrix and ownership coverage require verification. |
| Error handling | Partial | Mixed throws, logs, and fallback values. |
| Backups | Unknown | No backup/restore policy or automation evidenced. |
| Migration safety | Partial | CI applies migrations; rollback and production approval are unknown. |
| Secrets | Partial | Environment validation exists; rotation/storage policy is unknown. |
| Logging/monitoring | Partial | Console logs and health endpoints; production log pipeline/alerts unknown. |
| Rate limiting | Unknown | No repository evidence establishing it. |
| Recovery/deployment | Unknown | No complete CD/recovery topology established. |
| Testing | Strong breadth, incomplete risk closure | Broad tests; concurrency, production integration, and recovery gaps remain. |

## 13. Prioritized Findings

| ID | Severity | Category | Location | Evidence | Actual behavior | Risk / impact | Recommended remediation | Confidence |
|---|---|---|---|---|---|---|---|---|
| ARCH-P1-001 | P1 | Data reliability | `server/db.ts:64-93` | `getDb()` can return null; `upsertUser()` returns when db is unavailable | User upsert can be skipped without a thrown failure | Misleading success, missing identity persistence, difficult incident diagnosis | Define typed infrastructure failure semantics; make critical writes fail closed and add tests | High |
| ARCH-P1-002 | P1 | Architecture/security | `server/_core/context.ts`, `server/localAuth.ts`, `server/db.ts` | OAuth, local JWT, app-user JWT, and separate user tables | Actor resolution spans multiple identity stores | Account overlap, inconsistent logout/revocation, authorization drift | Document and then unify actor/account-linking policy before new features | High |
| ARCH-P1-003 | P1 | Authorization boundary | `shared/authorization.ts`, `server/_core/trpc.ts`, `server/routers.ts` | Stored permissions and manual role/procedure checks coexist | Access decisions are distributed | Missing or conflicting checks can expose sensitive data/mutations | Generate an authorization matrix and enforce server-side policy consistently | High |
| ARCH-P2-001 | P2 | Maintainability | `server/db.ts` | Large cross-domain module with queries, aggregates, business rules, and transactions | Changes cross unrelated domains | Regression risk and difficult ownership/testing | Split by bounded domain behind stable service interfaces after audit decisions | High |
| ARCH-P2-002 | P2 | API governance | `server/routers.ts` and client consumers | Large tRPC surface without one complete contract catalog | Security/transaction/test metadata is hard to review | Dead procedures and inconsistent conventions can persist | Generate procedure inventory as CI artifact | Medium |
| ARCH-P2-003 | P2 | Operations | `.github/workflows/ci.yml` | CI validates build/test but no CD/rollback/backup evidence | Deployment safety is not automated | Production failures may require manual recovery | Define deployment, migration approval, rollback, backup, and monitoring runbooks | High |
| ARCH-P3-001 | P3 | Observability | `server/_core/*`, server logging | Console logs and health endpoints, limited structured telemetry evidence | Failures may be difficult to correlate | Slower detection and diagnosis | Add structured request/error/audit telemetry with sensitive-data controls | Medium |

## 14. Recommended Remediation Roadmap

1. Establish a production safety baseline: typed database-unavailable errors, fail-closed critical writes, and regression tests for authentication and financial mutations.
2. Produce and approve the canonical identity/account-linking model without deleting or migrating records yet.
3. Generate the complete tRPC authorization/ownership/transaction/test matrix and close P1 security gaps.
4. Define financial source-of-truth, idempotency, immutable-history, and retry rules with fixtures.
5. Split `server/db.ts` incrementally by bounded domain while preserving tested procedure contracts.
6. Add concurrency, retry, duplicate-submission, external-service-failure, and migration-failure tests.
7. Define production deployment, migrations, backups, restore rehearsal, monitoring, alerting, and rollback.

## Audit Scope Note

This audit created documentation only. No application source, schema, migration, dependency, configuration, authentication, RBAC, or frontend behavior was modified.
