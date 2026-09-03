# Domain Discovery & System Specification

## 1. Executive Summary

The repository is an existing **React/Vite sales-team operations platform** with a server-side Express/tRPC application and a MySQL/Drizzle persistence layer. The implemented scope is broader than a minimal CRM: it includes daily work management, leads, visits, closing/deals, sales targets and commissions, collections, financial controls, reporting, sales execution/playbooks, evaluation and promotion, user management, permissions, and post-sale project timelines.

This conclusion is **Confirmed at the architecture level** by the registered routes in `client/src/App.tsx`, the database declarations in `drizzle/schema.ts`, and the procedure namespaces in `server/routers.ts`. The business meaning of some modules is additionally **Inferred** from page names, field names, and tests. This document intentionally does not promote unsupported CRM assumptions to requirements.

The current system is not a frontend-only mock. It contains a real relational schema, migrations, typed API procedures, authentication code, authorization helpers, data-access logic, and a large automated test suite. However, the repository contains multiple identity concepts (`users`, `engineers`, and `appUsers`) and several authorization paths. The exact production deployment, production database state, operational secrets, and organization-wide business policy remain **Unknown / Needs Verification**.

## 2. Current Architecture

| Layer | Confirmed implementation | Evidence |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind/Radix-style UI | `package.json`, `client/src/` |
| Routing | Wouter with lazy-loaded module pages and `DashboardLayout` | `client/src/App.tsx:4-69` |
| Data client | tRPC 11, TanStack React Query, SuperJSON | `package.json`, `client/src/lib/trpc.ts` |
| HTTP server | Express with health/readiness handling, OAuth, tRPC, and Vite/static serving | `server/_core/index.ts` |
| API contract | Typed tRPC routers; REST compatibility helpers also exist | `server/routers.ts`, `server/_core/index.ts` |
| Persistence | Drizzle ORM over MySQL using `mysql2` | `drizzle/schema.ts`, `drizzle.config.ts`, `server/db.ts` |
| Input validation | Zod schemas on router inputs | `server/routers.ts` |
| Authentication | Manus OAuth plus local engineer/app-user JWT paths | `server/_core/context.ts`, `server/localAuth.ts`, `server/db.ts` |
| Authorization | Public/protected/admin procedures plus role and permission helpers | `server/_core/trpc.ts`, `shared/authorization.ts` |
| Testing | Vitest unit/integration tests covering auth, roles, sales, visits, finance, timeline, and calculations | `server/*.test.ts`, `vitest.config.ts` |
| CI/CD | GitHub Actions validates migrations, type checking, runtime readiness, tests, and build | `.github/workflows/ci.yml` |

The request lifecycle is: React page or component → tRPC client → Express `/api/trpc` adapter → context and actor resolution → procedure guard → router handler → data/business functions in `server/db.ts` and related helpers → Drizzle/MySQL → React Query cache/UI. This flow is evidenced by `server/_core/index.ts`, `server/_core/context.ts`, `server/_core/trpc.ts`, and `server/routers.ts`.

## 3. Repository Findings

The main application directories are `client`, `server`, `shared`, and `drizzle`. Supporting evidence is present in `docs`, `review_artifacts`, `scripts`, `.github/workflows`, and `todo.md`. The repository has 114 commits on `main` at the inspected revision and contains approximately 50 declared MySQL tables; the existing reverse-engineering inventory records 314 indexed source/document files.

The frontend routes are `/`, `/login`, `/overview`, `/tasks`, `/leads`, `/visits`, `/closing`, `/sales-module`, `/kpi`, `/collections`, `/planning`, `/promotion-system`, `/reports`, `/sales-execution`, `/project-timeline`, `/user-management`, `/permissions`, `/dashboard`, and `/404`. Most operational routes are rendered inside `DashboardLayout`; `App.tsx` itself does not provide a complete route-level authorization barrier.

The project metadata describes a comprehensive sales management dashboard with analytics, sales tracking, customer management, interactive visualizations, authentication, role-based access control, and reporting. That repository description is evidence of stated product positioning, but it is not by itself proof that every advertised behavior is complete.

## 4. Requirements Findings

No single authoritative product-requirements document was identified in the repository inspection. Requirements are distributed across UI labels, page names, schema comments, router procedures, tests, migrations, `todo.md`, `TECHNICAL_DOCUMENTATION.md`, `docs/reverse_engineering.md`, and review artifacts.

The following are therefore treated as implementation evidence rather than normative business requirements. Where the code, tests, and documentation do not establish a rule, the status is **Unknown / Needs Verification**. In particular, no authoritative source was found for the organization’s definition of revenue, KPI time-zone policy, stage-transition policy, commission approval policy, retention requirements, or production deployment topology.

## 5. Domain Entities

| Entity / concept | Status | Evidence and interpretation |
|---|---|---|
| User | Confirmed | `users` table in `drizzle/schema.ts`; OAuth-oriented fields `openId`, `loginMethod`, role, timestamps. |
| Engineer / internal operator | Confirmed | `engineers` table and many `engineerId` references; role, department, status, credentials, seniority, and soft-delete fields exist. |
| App user account | Confirmed | `appUsers` table and app-user authentication paths in `server/db.ts`/`server/localAuth.ts`. Exact boundary from `engineers` is not fully unified. |
| Role | Confirmed | `APP_ROLES`, role enums, `SYSTEM_ROLES`, role checks, and role-management procedures. |
| Permission | Confirmed | `userPermissions`, `rolePermissions`, `sectionPermissions`, `PermissionsPanel`, and permission helpers. |
| Team | Inferred | Team/department concepts appear in planning, assignment, and authorization context, but a standalone team entity was not established by the inspected schema evidence. |
| Customer | Confirmed | `customers` table and customer-related UI/data procedures. Exact lifecycle relative to leads and deals is not fully specified. |
| Lead | Confirmed | `leads` table, `LeadsModule`, follow-up logs, and lead statistics. |
| Contact / company | Unknown / Needs Verification | Contact-like fields exist on leads/customers, but a separate canonical contact/company aggregate was not established. |
| Visit / consultation | Confirmed | `visits` table and `VisitsModule`, including booking, confirmation, execution, upload, quality, admin handling, and fee collection states. |
| Deal / closing | Confirmed | `deals`, closing pages, discount allocations, deal tasks, and deal timeline. |
| Sales stage | Inferred | Deal status/stage behavior is present in closing procedures and fields, but a fully configurable standalone stage model and transition policy are not established. |
| Product | Confirmed | `products` and `saleItems`; the exact catalog governance and pricing policy remain partly unspecified. |
| Sale / order | Confirmed | `sales` and related item/payment tables are present. Whether `sales` is the canonical order aggregate is **Unknown / Needs Verification**. |
| Payment / collection | Confirmed | `payments`, `collections`, `paymentPromises`, `commissionPayments`, and financial tables. |
| Activity / audit record | Confirmed | `activityLogs`, `auditLogs`, project audit logs, and timeline/movement tables. |
| Task / follow-up | Confirmed | `dailyTasks`, `dealTasks`, `adminSalesTasks`, and `leadFollowupLogs`. |
| Quote / quotation | Confirmed | `playbookQuotations` and quotation-related task/playbook fields. Exact quote approval and versioning policy is unknown. |
| Pipeline | Inferred | Closing/deal state and dashboard procedures imply pipeline reporting, but no single canonical pipeline aggregate was proven. |
| Target / goal | Confirmed | `monthlyTargets`, `engineerTargets`, `companyGoals`, and `engineerPersonalGoals`. |
| Commission / incentive | Confirmed | `commissionTiers`, `incentiveTiers`, commission calculations/payments, and KPI pages/tests. |
| Evaluation / career level | Confirmed | `engineerEvaluations` and `engineerCareerLevels`; promotion page and scoring tests support the concept. |
| Project after sale | Confirmed | `projects`, `projectStages`, `projectMovements`, `projectDelayLedger`, `projectUpdates`, and `ProjectTimelineModule`. |
| Notification | Unknown / Needs Verification | Notification/integration helpers exist, but a complete persisted notification domain was not established in the inspected evidence. |

## 6. Entity Evidence Matrix

| Domain element | Status | Evidence | Confidence | Needs verification |
|---|---|---|---|---|
| Operational sales dashboard | Confirmed | Routes, overview page, KPI/report procedures | High | No |
| Lead intake and assignment | Confirmed | `leads`, `assignedEngineerId`, lead procedures/tests | High | No |
| Visit lifecycle | Confirmed | Visit status fields and `visits` procedures/tests | High | No |
| Deal/closing workflow | Confirmed | `deals`, closing module, discount/deal tests | High | No |
| Productized sale items | Confirmed | `products`, `saleItems` | High | No |
| Financial collection | Confirmed | collection/payment/financial tables and procedures | High | No |
| Playbook-based sales execution | Confirmed | `playbookItems`, `playbookQuotations`, meeting/session tables and route | High | No |
| Post-sale project timeline | Confirmed | project tables, route, permission/timeline tests | High | No |
| Configurable stage transitions | Unknown / Needs Verification | Stage-like fields/procedures exist; standalone policy not proven | Low | Yes |
| Canonical customer-lead-deal identity | Unknown / Needs Verification | Multiple nullable IDs and duplicated client fields appear in schema | Medium | Yes |
| Production database and deployment | Unknown / Needs Verification | Local/CI configuration exists; production access/state not evidenced | High | Yes |

## 7. Entity Fields

The following fields are confirmed by the schema. Requiredness below means database nullability/default evidence, not necessarily business-level requiredness.

| Entity | Known fields and types | Evidence / caveat |
|---|---|---|
| `users` | `id` int, `openId` varchar unique, `name` text, `email` varchar, `loginMethod` varchar, `role` enum `user/admin`, timestamps, `lastSignedIn` | `drizzle/schema.ts:7-19`; OAuth/base user identity. |
| `engineers` | `id`, `name`, `email`, `phone`, `department`, `role`, `status`, `username`, `passwordHash`, `seniority`, soft-delete fields, `forcePasswordChange` | `drizzle/schema.ts:22-44`; credential and lifecycle rules are partly implemented in local auth. |
| `dailyTasks` | engineer/date/title/description, planned and actual hours, status, priority, delay/reschedule flags, type/category, deal/client linkage, recording fields, reminder, soft delete | `drizzle/schema.ts:47-108`; field semantics are explicit in comments but business authority needs verification. |
| `leads` | name, phone, email, source, assigned engineer, status, first-contact timestamp, response time, notes, timestamps, soft delete | `drizzle/schema.ts:111-131`. |
| `visits` | lead/engineer/client identity, address and schedule, booking/confirmation/execution/upload/quality/admin/financial states, delay metrics, fee, screenshot, collection, notes, soft delete | `drizzle/schema.ts:134-202`; many lifecycle dimensions are confirmed, but state-transition authority is not fully specified. |
| `deals` | visit/lead/engineer references plus client, closing/status/financial/discount-related fields | `drizzle/schema.ts:205+`, closing procedures, and discount tests. Full field list should be treated as schema evidence pending business-owner confirmation. |
| Sales/finance | `sales`, `saleItems`, `products`, `payments`, `collections`, `paymentPromises`, `commissionPayments`, cash balances/movements/commitments | `drizzle/schema.ts:363-509`; canonical boundaries among these aggregates require verification. |
| Goals/performance | `monthlyTargets`, `engineerTargets`, `companyGoals`, `engineerPersonalGoals`, `commissionTiers`, `incentiveTiers`, evaluations/career levels | `drizzle/schema.ts:256-362`, `776-846`, `920-979`. |
| Sales execution | playbook items/quotations, admin tasks/meetings, meeting reviews/sessions/actions | `drizzle/schema.ts:510-579`, `675-775`; workflow ownership and approval rules are not all explicit. |
| Project timeline | project stages/projects/movements/delay ledger/updates/audit logs/delay reasons | `drizzle/schema.ts:1157-1365`; post-sale operational tracking is strongly evidenced. |
| Security/audit | user/role/section permissions, audit/activity logs | `drizzle/schema.ts:609-674`, `980-1122`; retention and tamper-resistance policies are unknown. |

## 8. Relationships

The following relationships are supported by explicit foreign-key-like fields, joins, or repeated procedure usage. A `?` denotes an unresolved relationship, not an assumed schema requirement.

```text
User / AppUser / Engineer
 ├── has role → Role
 ├── may have → Permission
 ├── performs → Activity / Audit Log
 └── may be assigned → Task, Lead, Visit, Deal, Goal, Project work

Lead
 ├── assigned to → Engineer ?
 ├── has → Follow-up Logs
 ├── may have → Visit
 └── may convert to → Deal / Customer ?

Customer
 └── has → Contact or sales history ?

Visit
 ├── references → Lead ?
 ├── assigned to → Engineer
 ├── may produce → Deal
 └── may generate → Fee / Collection

Deal / Closing
 ├── references → Lead ?
 ├── references → Visit ?
 ├── owned by → Engineer
 ├── contains → Products through Sale Items ?
 ├── has → Discount Allocations / Deal Tasks / Timeline
 └── may produce → Sale / Project

Sale
 ├── contains → Sale Items
 └── has → Payments / Collections ?

Company / Engineer Goals
 └── measured through → Tasks, Sales, KPI, Commission, Evaluation ?

Project
 ├── has → Project Stages
 ├── has → Movements / Updates
 ├── has → Delay Ledger / Reasons
 └── has → Project Audit Logs
```

The exact cardinality, ownership, deletion behavior, and canonical conversion events for several links are **Unknown / Needs Verification**. The presence of nullable IDs and duplicated client identity fields means that a future schema decision must not be inferred solely from conventional CRM design.

## 9. Sales Pipeline

A sales/closing pipeline is **Inferred to Confirmed implementation scope**, because the repository contains a closing module, deal records, status/analysis procedures, discount logic, lost-deal tests, and dashboard/KPI behavior. However, the following policy details are not sufficiently authoritative in the inspected material:

| Pipeline question | Finding |
|---|---|
| Stage names | Some status/stage-like enums and UI labels exist; canonical business list is **Unknown / Needs Verification**. |
| Ordering | **Unknown / Needs Verification**. |
| Allowed transitions | Procedures/tests cover selected behaviors, but a complete transition matrix is not proven. |
| Who can change stages | Role guards exist in procedures; complete stage-specific policy is **Unknown / Needs Verification**. |
| Configurability | No confirmed standalone configurable stage administration model. |
| Probabilities | **Unknown / Needs Verification**. |
| KPI effect | Closing/KPI procedures imply reporting effects; authoritative formulas and inclusion rules need confirmation. |
| Backward movement | **Unknown / Needs Verification**. |
| Transition history | Deal timeline/audit structures exist; whether every stage change is recorded is **Unknown / Needs Verification**. |

## 10. Business Workflows

| Workflow | Status | Evidence |
|---|---|---|
| Login and forced password change | Confirmed | `LoginPage`, `server/localAuth.ts`, `forcePasswordChange`, auth tests. |
| Create/assign/track daily tasks | Confirmed | `TasksModule`, `dailyTasks`, task procedures/tests. |
| Lead intake, assignment, contact tracking, and follow-up | Confirmed | `LeadsModule`, lead fields, follow-up logs, lead tests. |
| Book, confirm, execute, upload, quality-check, and collect visit fee | Confirmed | Visit lifecycle fields and `VisitsModule`/tests. |
| Create/manage closing deals and discounts | Confirmed | `ClosingModule`, `deals`, discount tables/procedures/tests. |
| Track products, sales, payments, and commissions | Confirmed | Sales/finance schema and related modules/tests. |
| Define goals and calculate KPI/performance | Confirmed | Planning/KPI routes, target tables, calculation tests. Exact formulas may still be unknown. |
| Evaluate and promote engineers | Confirmed | Promotion page, evaluation/career tables, scoring tests. Policy authority needs verification. |
| Execute sales playbook and meeting review | Confirmed | Sales execution route and playbook/meeting tables. |
| Track projects after sale with delays/SLA | Confirmed | Project timeline route/tables/tests. |
| Approval workflow for deals/payments/discounts | Unknown / Needs Verification | Some role checks and review entities exist, but a universal approval workflow was not proven. |
| Delete versus soft-delete policy | Confirmed in selected entities | Multiple soft-delete columns and soft-delete tests; scope and retention policy need verification. |

## 11. KPI Analysis

The repository exposes overview, KPI, reports, sales, finance, visits, leads, and performance views. KPI calculation code and tests exist, but the authoritative business glossary is not present.

| KPI area | Current evidence | Formula/authority |
|---|---|---|
| Sales and closing | Closing/sales procedures, deal/sale records, dashboard pages | Exact definition, gross/net basis, and date basis: **Unknown / Needs Verification**. |
| Leads and response | Lead status, `firstContactAt`, `responseTimeMinutes`, lead daily statistics | Calculation behavior exists; target thresholds and exclusion rules need verification. |
| Visits | Booking, confirmation, execution, upload, quality, delay, and fee fields plus visit KPI tests | Operational counts/delays are evidenced; denominator/time-zone rules need verification. |
| Collections/liquidity | Payments, collections, cash balances/movements/commitments, financial liquidity tests | Financial definitions and reconciliation authority need verification. |
| Targets and commissions | Target, tier, incentive, evaluation, and commission procedures/tests | Tier policy and approval/finalization rules need verification. |
| Project delivery | Project movement, delay ledger, SLA/timeline structures | SLA definitions, pause rules, and business calendar need verification. |
| Reports | Weekly/monthly/quarterly report route/page | Period boundaries, timezone, and source-of-truth selection are not fully specified. |

The implementation must not treat displayed dashboard figures as a complete requirements specification. The exact formulas, timezone, fiscal calendar, treatment of soft-deleted records, and snapshot versus live calculation policy remain open.

## 12. User / Role / Permission Analysis

Roles are explicitly enumerated in `shared/authorization.ts`: `admin`, `engineer`, `admin_sales`, `sales_engineer`, `tele_sales`, `site_engineer`, `system_user`, `sales_specialist`, `interior_designer`, `manager`, and `group_admin`. Shared predicates identify sales roles, manager roles, user-management roles, and privileged role-management roles. The system also defines module keys for overview, tasks, CRM, visits, closing, sales, KPI, collections, planning, reports, sales execution, promotion, users, and permissions.

`protectedProcedure` requires an actor and `adminProcedure` accepts admin/manager-style access according to `server/_core/trpc.ts`. Several business procedures also perform manual role or ownership checks. This is **Confirmed**, but the complete authorization matrix, inheritance model, and precedence between stored permissions and hard-coded role checks are **Unknown / Needs Verification**.

The frontend exposes user-management and permissions screens, but frontend visibility is not proof of server-side authorization. The repository contains server checks in many sensitive paths, yet a complete audit should verify every mutation and every read for tenant/department/ownership scope.

## 13. Persistence Analysis

Current persistence is **relational and server-backed**, not merely in-memory demo data. `drizzle/schema.ts` declares MySQL tables, migration files exist, and `server/db.ts` performs database access. Some UI state remains local presentation state, as expected for forms, filters, calendars, and dialogs. The repository also contains generated/demo or fallback-looking structures in parts of the frontend, so each page should be verified against its actual tRPC caller before being classified as fully production-backed.

| Mechanism | Finding |
|---|---|
| Hardcoded/demo data | May exist in UI helpers and seed-like paths; exact page-by-page usage requires targeted tracing. |
| React local state | Confirmed for UI interaction state. |
| Browser storage | Not established as the primary domain persistence mechanism. |
| API | Confirmed: typed tRPC procedures and HTTP adapter. |
| Database | Confirmed in code; production connectivity/state is not verified. |
| External storage | S3 SDK/helpers exist; business usage and retention are **Unknown / Needs Verification**. |

## 14. API Analysis

A backend API is present. The primary contract is tRPC, with approximately 33 namespaces and 291 procedures recorded by the existing reverse-engineering inventory. Procedures use Zod inputs in the router layer and call database/business functions. Public, protected, and admin procedure classes are present.

There is no single manually maintained API contract document covering every endpoint, request, response, error, authorization rule, and consumer. Therefore, the exact API inventory should be generated from `server/routers.ts` and validated against all `client/src` callers before backend changes are planned. The statement “No backend API currently identified” does **not** apply to this repository.

## 15. Validation & Business Rules

Confirmed frontend/server validation includes typed input schemas, enum constraints, numeric/date-like fields, authentication credential checks, role checks, soft-delete handling, and calculation-specific guards. Tests cover role permissions, user management, sales, discounts, financial liquidity, lead follow-up, visit KPIs, project-timeline permissions, and other domain calculations.

The following distinction is mandatory:

> **Frontend validation is not authoritative business authorization.**

The repository does not establish a complete, centralized business-rule catalog. Required fields at the database level are known from `.notNull()`, but business-required fields and cross-entity constraints need verification. In particular, duplicate prevention, legal payment constraints, immutable financial records, exact stage transitions, date/time-zone policy, and commission finalization are not uniformly documented as authoritative rules.

## 16. Contradictions

| Conflict | Requirement/description | Implementation evidence | Recommended resolution |
|---|---|---|---|
| Product description versus architecture maturity | Repository description advertises authentication/RBAC/reporting | These features are materially present, but multiple identity and authorization paths remain | Treat advertised capabilities as scope, then verify production-grade policy and coverage. |
| Canonical identity | UI/domain language uses user, engineer, and app user concepts | Separate `users`, `engineers`, and `appUsers` tables/auth paths | Define canonical actor identity and migration/boundary policy before extending backend. |
| Client identity duplication | Leads/visits/deals contain client name/contact fields and nullable IDs | `leadId`, `visitId`, `engineerId`, and client fields coexist | Confirm source of truth and whether denormalized snapshots are intentional. |
| Permissions | Shared module/role lists and database permission tables coexist with manual role checks | `shared/authorization.ts`, permission tables, router guards | Produce one authoritative authorization matrix and test it server-side. |
| Documentation versus current code | Existing docs describe earlier or summarized states | Current schema/router has evolved through many migrations/commits | Treat source and executed tests as current evidence; update docs when decisions are confirmed. |

## 17. Unknowns / Needs Verification

The critical unknowns are the canonical actor model; organization/tenant boundaries; exact lead-to-customer-to-deal conversion semantics; canonical sale/order/payment aggregates; stage names, ordering, transitions, probabilities, and history; KPI formulas and timezone; commission and discount approval/finalization; deletion and retention policy; production database and deployment topology; secrets management; S3/notification integration behavior; and the authoritative permission matrix.

No assumption should be implemented for these items during the next phase. Each should receive an explicit decision from the product owner or be traced to an authoritative existing policy.

## 18. Architecture Gaps

| Area | Gap |
|---|---|
| Frontend | Route-level access behavior is not the same as complete authorization; page-by-page data-source and loading/error conventions should be standardized. |
| Backend | `server/db.ts` combines data access with substantial business logic; boundaries and transaction policy should be documented before expansion. |
| Database | Multiple identity and client representations need canonicalization decisions; relationship/cardinality rules are not fully documented. |
| Authentication | Multiple authentication sources exist; session lifecycle, account linking, revocation, and production secret policy require a single documented model. |
| Authorization/RBAC | Hard-coded role checks and stored permission structures coexist; complete read/mutation matrix is missing. |
| API | No complete generated contract catalog with errors, scopes, and versioning policy was found. |
| Validation | Cross-entity and business-level validation is distributed rather than captured in one authoritative rule set. |
| Business logic | KPI, commission, pipeline, and financial definitions need signed-off formulas and time semantics. |
| Testing | Broad coverage exists, but production-like database/runtime and authorization matrix coverage should be confirmed in CI. |
| CI/CD | CI validation is present; deployment/release and migration rollback policy are not established in the inspected repository. |
| Deployment | Production topology, environment ownership, and observability endpoints are unknown. |
| Observability | Health/readiness exist; complete metrics, tracing, structured audit, and alerting policy are not evidenced. |
| Security | Secrets, token rotation, rate limiting, authorization completeness, and sensitive-data retention require review. |

## 19. Technical Constraints

The repository already establishes strong implementation constraints: TypeScript, React/Vite, Express, tRPC, Drizzle, MySQL, Zod, Vitest, pnpm, and GitHub Actions. `package.json`, lockfiles, TypeScript/Vite configuration, Drizzle configuration, and CI should be treated as the current technical baseline.

The repository does not provide enough evidence to finalize new choices such as Express versus Fastify, Drizzle versus Prisma, MySQL versus PostgreSQL, JWT versus server sessions, or REST versus GraphQL. For any such choice, the status is **Architecture Decision Required**. The existing stack should not be replaced merely because a conventional CRM architecture might use another stack.

## 20. Open Questions

1. Which identity is canonical for business ownership: `users`, `engineers`, `appUsers`, or a normalized actor model?
2. Is the product single-company, multi-department, or multi-tenant? What data isolation boundary is required?
3. What are the official lead, visit, deal, sale, and project lifecycle states and allowed transitions?
4. When does a lead become a customer, and which record is authoritative after conversion?
5. What is the canonical financial source of truth for revenue, collections, cash, commitments, and commissions?
6. What formulas, timezone, fiscal calendar, and soft-delete treatment govern each KPI?
7. Which roles may read, create, update, delete, approve, or finalize each module and field?
8. Are discounts, quotes, payments, commissions, and project delays subject to approval workflows?
9. Which data must be immutable, auditable, exportable, or retained for a defined period?
10. What are the production database, deployment, backup, monitoring, and incident-response requirements?

## 21. Recommended Next Phase

Phase 2 should be a **decision and contract-definition phase**, not an immediate technology rewrite. First, obtain product-owner decisions for the open questions above. Next, generate a complete procedure-to-page/API inventory, normalize the actor and ownership model, document lifecycle transition matrices, and define KPI/financial formulas with fixtures. Then produce an authorization matrix and test plan covering every mutation and sensitive read. Only after those decisions should the project select or confirm backend boundary changes, database migrations, and API extensions.

No Phase 2 implementation is performed by this document.

## 22. Appendix: Evidence / File References

- `client/src/App.tsx` — route registry, lazy pages, layout wrapping.
- `client/src/pages/` — domain modules and UI workflows.
- `server/_core/index.ts` — Express entrypoint, readiness/health, tRPC integration.
- `server/_core/context.ts` — OAuth/cookie actor resolution.
- `server/_core/trpc.ts` — public/protected/admin procedure guards.
- `server/routers.ts` — typed API namespaces and procedures.
- `server/db.ts` — database access and business calculations.
- `server/localAuth.ts` — local login, bcrypt, JWT, status and password-change handling.
- `shared/authorization.ts` — roles, module keys, and role predicates.
- `drizzle/schema.ts` — MySQL table and field declarations.
- `drizzle/*.sql` — schema migration history.
- `package.json` — scripts, dependencies, and package manager baseline.
- `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `drizzle.config.ts` — build, type, test, and database configuration.
- `.github/workflows/ci.yml` — CI installation, migration, type check, runtime readiness, tests, and build.
- `docs/reverse_engineering.md` — existing evidence-based reverse-engineering summary.
- `TECHNICAL_DOCUMENTATION.md` — existing technical documentation and audit material.
- `review_artifacts/validation_summary.md` — existing validation results.
- `todo.md` — implementation history/backlog; not treated as authoritative proof of completion.

## Execution Note

This phase created only `docs/domain-discovery.md`. No application code, backend, database migration, dependency, authentication, RBAC, or demo-data implementation was modified.
