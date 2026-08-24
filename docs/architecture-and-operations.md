# Architecture and Operations Contract

## Domain boundaries

The backend is being migrated incrementally from a monolithic data layer into explicit domains. New business logic must be placed in one of these domains rather than added to an unrelated router or persistence helper.

| Domain | Responsibility | Primary current entry points |
|---|---|---|
| Identity and authorization | Actor resolution, sessions, roles, permissions, revocation | `server/_core/context.ts`, `server/_core/trpc.ts`, `server/localAuth.ts` |
| CRM | Leads, visits, engineers, customer assignment | `server/db.ts` CRM helpers and related routers |
| Deals | Pipeline, stage transitions, period attribution, discounts | `server/db.ts` deal helpers and closing routers |
| Finance | Collections, payments, promises, commissions, money arithmetic | `server/db.ts`, `shared/money.ts` |
| KPI and reporting | Aggregation, targets, achievement, reports | KPI/report routers and query helpers |
| Project timeline | Stages, movements, delays, audit history | Project timeline helpers and router |
| Playbook and meetings | Playbook items, quotations, sessions, reviews | Playbook/meeting helpers and routers |

The existing large files remain compatibility facades during migration. A new function should be extracted into a focused domain module when it is reused, transactional, or contains a business invariant. Cross-domain writes must be called through a domain service and must use one transaction.

## Canonical money policy

All monetary values are stored as decimal database values and are calculated in integer cents at application boundaries. `shared/money.ts` is the canonical implementation. Financial code must not use unrounded floating-point addition or subtraction for persisted totals.

| Measure | Definition |
|---|---|
| Gross value | Contract value before discount. |
| Discount value | Approved reduction from gross value; it cannot exceed gross value. |
| Net value | Gross value minus discount value. |
| Collected cash | Sum of recorded payments for a collection. |
| Recognized revenue | A separately approved reporting measure; it must not be inferred implicitly from collected cash. |

Every new report or payout calculation must name the measure it uses and include a table-driven test for rounding, zero values, and boundary conditions.

## Legacy sales model

The tables `customers`, `products`, `sales`, and `sale_items` are retained until production usage is measured. They are classified as a legacy compatibility model, not an alternative source of truth for the current leads/deals/collections workflow. No new feature should write to both models without an explicit synchronization design. Removal or migration requires a usage inventory and product-owner approval.

## Integration governance

Every external integration must have an owner, a documented payload, a timeout, a retry/fallback policy, and a data-classification review. Customer names, phone numbers, deal values, and internal permission data must not be sent to external providers unless the integration contract explicitly permits it. Integration failures must produce an identifiable error and must not silently report a persisted business action.

## Release gates

The local gates are `pnpm check`, `pnpm test`, `pnpm build`, and `git diff --check`. GitHub Actions additionally provisions MySQL and runs the migration before the same checks. Production readiness requires the MySQL migration, foreign-key, authorization-matrix, and transaction failure tests to pass in CI; local unit-test success alone is insufficient.
