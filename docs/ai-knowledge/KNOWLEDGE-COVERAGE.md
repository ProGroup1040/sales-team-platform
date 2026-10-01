# Knowledge Coverage Report

## Covered

- Architecture and request lifecycle
- Route/module map
- Daily task creation, ownership, statuses, and soft delete
- Identity models and task authorization
- Core database entities and financial boundaries
- KPI traceability rules and known calculation families
- Known issues, conflicts, and unknowns
- Onboarding and employee FAQ

## Evidence reviewed

`client/src/App.tsx`, `client/src/pages/`, `server/routers.ts`, `server/db.ts`, `server/_core/context.ts`, `server/localAuth.ts`, `drizzle/schema.ts`, migrations, shared authorization/money helpers, tests, and existing audit documents under `docs/`.

## Verified facts

Typed tRPC procedures, MySQL/Drizzle persistence, multiple identity entities, daily task ownership by `engineerId`, task access enforcement, soft-delete fields, and cents-based money helpers are verified by source.

## Inferred facts

Some module business meanings and relationships are inferred from names, joins, comments, and UI flows. They are labeled as inferred in the detailed documents.

## Unknowns and conflicts

Production state, complete business policy, canonical financial/customer source of truth, universal KPI formulas, timezone/retention rules, complete transition matrices, and one unified permission source remain unknown or conflicting.

## Critical gaps

Add production-backed reconciliation tests, an authoritative KPI catalog, explicit identity/ownership constraints, universal idempotency for financial mutations, and a documented permission precedence model before treating this knowledge base as a complete operational specification.

## Detailed references added

- [Detailed KPI formulas](kpi-formulas-detailed.md) — main 55/20/25 KPI, operational score, planning score, visit scores, closing rate, commission and incentive gates.
- [Detailed module guide](modules-detailed.md) — module routes, APIs, tables, workflows, and source-of-truth warnings.
