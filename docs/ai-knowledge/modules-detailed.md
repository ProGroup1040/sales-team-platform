# Modules — Detailed Operating Guide

## Platform request flow

```text
User action
  -> React page/component
  -> tRPC client and React Query
  -> Express /api/trpc
  -> context actor resolution
  -> protected/admin procedure
  -> Zod validation
  -> server/db.ts helper
  -> Drizzle/MySQL
  -> cache invalidation/refetch
  -> UI
```

Evidence: `client/src/App.tsx`, `client/src/lib/trpc.ts`, `server/_core/index.ts`, `server/_core/context.ts`, `server/_core/trpc.ts`, `server/routers.ts`.

## Route/module map

| Route | Module | Main API namespaces | Main entities | What it does |
|---|---|---|---|---|
| `/overview`, `/dashboard` | Overview/Dashboard | overview/report/KPI procedures | aggregate data | Displays operational and sales summaries. Exact cards depend on procedure used. |
| `/tasks` | Daily Tasks | `tasks.*`, `softDelete.task` | `dailyTasks` | Create, list, filter, schedule, update status, soft delete, calendar, critical tasks, recordings. |
| `/leads` | Leads | `leads.*`, `leadDailyStats.*`, `leadFollowup.*` | `leads`, follow-up logs | Capture, assign, contact, qualify, convert, and measure response/follow-up. |
| `/visits` | Visits | `visits.*`, `softDelete.visit` | `visits` | Book, confirm, execute, upload, review quality, collect fee, soft delete. |
| `/closing` | Closing | `closing.*`, `dealTasks.*` | `deals`, deal tasks, discounts | Track pipeline, won/lost outcomes, next actions, discounts, and closing workflows. |
| `/sales-module` | Sales | `sales.*`, products/customers | `sales`, `saleItems`, `products`, `customers` | Legacy/productized sales model; canonical relationship to current closing is not fully established. |
| `/kpi` | KPI | `kpi.engineers`, `trend`, `operationalPerformance`, `enhancedRanking`, `companyClosingKPI`, `teamRewardStatus`, earnings | targets, tasks, visits, leads, deals, finance | Presents multiple KPI engines, scores, ranking, commissions, incentives, rewards, and lost-deal impact. |
| `/collections` | Collections | `collections.*`, `financial.*` | collections, payments, promises | Contract amount, paid amount, outstanding balance, promises, settlement and commission. |
| `/planning` | Planning | `planning.*`, `workDist.*` | engineer/company targets, tasks | Configure targets, task distribution, operational breakdown, performance scores. |
| `/sales-execution` | Sales Execution | `playbook.*`, `meetingReview.*`, `adminSalesTasks.*` | playbooks, meetings, quotations, reviews | Guided sales activities and meeting recording/review workflows. |
| `/project-timeline` | Project Timeline | `projectTimeline.*` | projects, stages, movements, delays, updates | Post-sale delivery stages, holds, delays, updates, and audit history. |
| `/reports` | Reports | `reports.*`, pipeline/funnel | report aggregates | Cross-module reporting; each report must be traced to its query. |
| `/promotion-system` | Promotion | `promotion.*` | evaluations, career levels | Performance evaluation and career/promotion data. |
| `/user-management` | User Management | `appUsers.*`, management procedures | app users, engineers, permissions | Accounts, passwords, status, engineer linkage, role restrictions, direct permissions. |
| `/permissions` | Permissions | `rolePermissions.*`, `sectionPermissions.*` | role/section/user permission tables | Configure visibility and CRUD/scope settings. Backend enforcement varies by module. |

## Daily Tasks in detail

### Creation
- Privileged path: `tasks.create` accepts an engineer ID, checks task add permission and scope, validates department task type, then writes `dailyTasks`.
- Regular linked path: `tasks.createMine` accepts no owner ID; it derives `engineerId` from `access.caller.engineerId`.
- The UI in `TasksModule.tsx` shows “إضافة مهمتي” for a regular linked user and uses `createMine`.

### Reading and filtering
`tasks.list`, `stats`, `filtered`, `calendarView`, `timeline`, and `criticalEnhanced` use the task access helper. Non-`all` scope is forced to the caller's engineer ID. Time filters and advanced filters are applied in the corresponding procedure/helper.

### Status and deletion
Statuses in the router/schema include `planned`, `completed`, `delayed`, `not_done`, and `client_delay`. Deletion is soft delete through `softDelete.task`; list/aggregate code should exclude `isDeleted = 1`.

## Leads

Leads carry contact data, source, assigned engineer, status, response timing, and notes. Lead daily statistics calculate contact/delay/conversion rates. The source-of-truth relationship between lead, customer, visit, and deal is partly denormalized and must not be guessed.

## Visits

Visits contain multiple lifecycle dimensions rather than one simple status: booking, confirmation, scheduled/execution status, upload, quality, admin/distribution, fee collection, deletion reason and audit timestamps. Month filters are generally based on `scheduledAt`; stats must use the same period and `isDeleted = 0` predicate as list queries.

## Closing and deals

Deals link to engineer and optionally lead/visit. Closed-won value feeds sales achievement and progressive commission. Open deals use `nextAction` for CRM compliance. Closed/lost and accounting/closing period fields create multiple period-selection paths; reports must identify which path they use.

## Collections and finance

Collections contain contract and collected amounts; payments and promises provide detail. Money calculations use integer cents at application boundaries through `shared/money.ts`; database values remain decimal strings. Posted financial-record deletion and universal idempotency policy are not fully established.

## Planning and targets

`engineerTargets` stores monthly sales and operational targets. Planning can compare completed task actuals to activity targets. Company goal setup derives:

```text
requiredDeals = ceil(revenueTarget / avgDealValue)
requiredVisits = ceil(requiredDeals / closingRate)
requiredPipelineValue = requiredDeals × avgDealValue × (1 / closingRate)
```

The code expects closing rate as a decimal for this calculation after dividing the supplied percentage by 100.

## User management and permissions

The system contains OAuth users, local engineers, and app users. An app user can be linked to an engineer; this link is required for personal daily-task ownership. Roles, direct permissions, section permissions, and hard-coded role guards coexist. A permission setting in the UI is not proof that every backend endpoint uses it.

## Project timeline

The project timeline has project/stage/movement/delay/update/audit entities. Stage transitions, holds, delays, and close operations are handled by `projectTimeline.*`; the complete business SLA and transition policy must be read from the transition procedures/tests rather than inferred from labels.

## Source-of-truth and conflict rules

- Use `server/routers.ts` to identify API entry points.
- Use `server/db.ts` to identify calculations and SQL filters.
- Use `drizzle/schema.ts` for fields and nullability.
- Use tests for executable expectations.
- If two functions calculate similarly named scores differently, report both and label the relationship **CONFLICTING/PARALLEL IMPLEMENTATIONS**.
