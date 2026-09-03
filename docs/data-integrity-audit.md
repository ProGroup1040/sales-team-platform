# Data Integrity and Financial Safety Audit

## 1. Domain Data Model

The database is a MySQL relational model defined in `drizzle/schema.ts`. Confirmed core records include `engineers`, `dailyTasks`, `leads`, `visits`, `deals`, `products`, `sales`, `saleItems`, `payments`, `collections`, `paymentPromises`, `commissionPayments`, goals/targets, playbook/meeting records, permissions, and project-timeline records.

The model is feature-rich but contains multiple representations of identity and client information. For example, leads, visits, and deals can carry nullable linking IDs while also carrying client-name/contact snapshots. This may be intentional denormalization, but the source-of-truth policy is **Unknown / Needs Verification**.

## 2. Database Constraints

| Area | Confirmed evidence | Integrity assessment |
|---|---|---|
| Primary keys | Tables use auto-increment integer IDs | Strong basic identity; global cross-table identity is not implied. |
| Nullability | Many business links are nullable; core names/owner fields often `.notNull()` | Flexible ingestion but permits incomplete relationships. Business-requiredness needs verification. |
| Unique constraints | `users.openId` and `engineers.username` are unique; other constraints appear selectively | Duplicate prevention is incomplete unless enforced in business code. |
| Indexes | `uniqueIndex` and selected indexes are present in schema | Full query/index review is required for production scale; not all access patterns were assessed. |
| Foreign keys | Relationship-like fields and references exist across schema/migrations | Complete cascade and referential policy requires migration-level verification. |
| Cascades | No universal cascade policy was established | Deletion/orphan behavior needs explicit review. |
| Money | Decimal fields exist for several amounts; shared money helpers use cents in selected paths | Representation is mixed across schema/calculation boundaries and must be standardized/documented. |
| Timestamps | `timestamp`, `date`, and explicit month/year fields coexist | Timezone and event-date authority require verification. |
| Soft delete | Engineers, tasks, leads, visits, and other records include flags/reason metadata | Queries must consistently exclude deleted records and financial history must not be erased. |

## 3. Transactions

Transactions are confirmed in important functions, including payment/follow-up settlement, permission replacement, and deal reopening. The code contains comments indicating atomic intent for permission replacement and preservation of financial/project history when reopening deals. This is positive evidence that transaction safety is considered in parts of the system.

| Workflow | Transaction evidence | Failure/duplicate assessment |
|---|---|---|
| Deal create/update/reopen | Reopen path uses `db.transaction`; other deal operations require per-procedure review | Reopen atomicity is evidenced; complete deal mutation coverage is not proven. |
| Sale/items | Sale and item records exist; complete write path and transaction boundary require review | Partial writes/duplicate submissions remain possible unless each path is transactional/idempotent. |
| Payment/follow-up | Settlement path uses a transaction and validates confirmed promise/amount | Stronger protection in this path; duplicate-payment policy across all payment mutations is unknown. |
| Collections/promises | Related transaction/confirmation operations exist | Full collection lifecycle atomicity and retry behavior need verification. |
| Commission | Commission tables/calculations exist | Whether calculation and payment finalization are one atomic operation is unknown. |
| Discounts | Discount allocations/tier logic exist | Exact atomic boundary and concurrent-edit behavior need verification. |
| Project movement | Timeline transition paths and audit/movement tables exist | Confirmed transaction coverage must be checked for every transition/update combination. |
| User/permission changes | Permission replacement explicitly uses a transaction | Good atomicity for that operation; account status/role/session side effects may span additional writes. |

For any workflow without a transaction, a failure after the first write can leave partial state. The repository does not establish a universal idempotency key or retry policy for financial mutations. This is a P1/P2 risk depending on the specific operation, not a proven production loss.

## 4. Financial Integrity

Financial concepts are distributed across `deals`, `sales`, `payments`, `collections`, `paymentPromises`, `commissionPayments`, financial cash balances/movements/commitments, and visit fees. The code includes decimal schema fields and shared money utilities, while selected settlement logic explicitly converts amounts to cents and verifies promise amounts.

| Financial question | Finding |
|---|---|
| Source of truth | **Unknown / Needs Verification** across deal, sale, collection, and financial dashboards. |
| Money precision | Decimal columns and cents-based helpers are both present; boundaries need documentation. |
| Currency | No authoritative multi-currency model was established. |
| Rounding | Some helper/calculation behavior is tested; global rounding policy is unknown. |
| Transaction boundaries | Present in selected settlement/permission/lifecycle paths, not proven globally. |
| Duplicate payment protection | Amount/promise matching exists in one settlement path; universal idempotency is unknown. |
| Immutable history | Audit/timeline records exist; universal immutable financial-record policy is not proven. |
| Update/delete behavior | Soft delete and update paths exist; treatment of posted financial records requires explicit policy. |
| Auditability | Audit logs and financial movement records exist; retention/tamper protection are unknown. |
| Commission dependencies | Tier/calculation procedures and tests exist; finalization/approval authority is unknown. |

Financial reporting should not be treated as production-safe until source-of-truth, transaction, idempotency, immutable-history, and reconciliation rules are signed off.

## 5. Lifecycle / State Machines

| Entity | Confirmed states/fields | Transition audit |
|---|---|---|
| Lead | `new`, `contacted`, `qualified`, `unqualified`, `converted` | State values are confirmed; complete allowed transitions and transition side effects require verification. |
| Visit | Booking, confirmation, execution, upload, quality, group/admin, fee/collection states | Lifecycle dimensions are explicit; cross-field transition matrix is not fully documented. |
| Deal | Stage/status-like fields including closed outcomes and negotiation behavior | Reopen path validates closed state and resets selected fields; complete matrix is unknown. |
| Payment/collection | Pending/confirmed/promise/settlement concepts | Settlement validation is evidenced; all transition guards and immutable rules need review. |
| Project | Configured stages, movement, hold, delay, close, updates | Timeline procedures/tests provide evidence; complete state machine and SLA semantics require verification. |
| Task | Planned/completed/delayed/not-done/client-delay plus reschedule flags | Status values are explicit; transition authority and audit side effects vary by path. |

The principal integrity risk is that status fields can be changed through multiple procedures unless every mutation shares one transition validator. No redesign is performed in this audit.

## 6. Duplicate Prevention

Confirmed duplicate controls include unique OAuth `openId`, unique engineer username, and selected matching logic for payment promises. Many business entities have no visible universal natural-key constraint: leads can share contact data, visits can share schedule/client data, and payment/deal submissions may be retried. The repository therefore needs explicit idempotency and duplicate rules for each critical mutation.

## 7. Soft Delete

Soft-delete fields are present on multiple entities, including flags, deletion timestamps, reasons, custom reasons, and deleting actor information. Dedicated `softDelete` procedures and tests exist. This is good evidence of intentional reversible/lifecycle-aware deletion.

Risks remain: the repository does not prove that every read excludes deleted records, that every aggregate excludes them consistently, that financial records are never soft-deleted inappropriately, or that restoration/retention is governed by one policy. Duplicated client snapshots may also survive record deletion and create reporting ambiguity.

## 8. Auditability

Audit and activity tables exist, as do project audit logs, deal timeline, project movements, and delay ledgers. Selected lifecycle code records historical context. The audit trail’s completeness, immutability, retention, actor identity, and protection from privileged alteration are **Unknown / Needs Verification**.

## 9. Data Consistency Risks

1. **Mixed money representations.** Decimal database columns and cents-based helpers require a documented conversion boundary to prevent rounding or unit errors.
2. **Multiple client identities.** Nullable lead/visit/deal IDs coexist with copied client fields, creating possible divergence.
3. **Multiple actor identities.** User/engineer/app-user records can produce inconsistent ownership and audit attribution.
4. **Partial writes.** Not every multi-write business workflow is proven atomic or retry-safe.
5. **Status cross-fields.** Visits have several parallel state dimensions; without a shared transition matrix, combinations may become invalid.
6. **Soft-delete aggregates.** Dashboard/report procedures must consistently filter deleted records.
7. **Time dimensions.** Event timestamps and stored month/year columns can disagree if timezone or backfill rules are not centralized.

## 10. Prioritized Findings

| ID | Severity | Category | Location | Evidence | Actual behavior | Risk/impact | Recommended remediation | Confidence |
|---|---|---|---|---|---|---|---|---|
| DATA-P1-001 | P1 | Financial reliability | `server/db.ts`, financial routers | Transactions exist in selected paths, but universal idempotency/source-of-truth policy is not established | Some financial workflows may rely on caller retry/duplicate handling | Duplicate payments, partial financial state, reconciliation burden | Define atomic boundaries, idempotency keys, immutable posting rules, and reconciliation tests per mutation | Medium |
| DATA-P1-002 | P1 | Persistence failure | `server/db.ts:64-93` | `getDb()` can return null; `upsertUser()` silently returns | A write can be skipped without failure | Data loss/misleading success in a critical identity path | Fail closed and test unavailable-database behavior for all critical writes | High |
| DATA-P2-001 | P2 | Canonical data model | `drizzle/schema.ts` | Multiple nullable links and duplicated client fields | Related business concepts may diverge | Incorrect reports, orphan records, ambiguous ownership | Approve canonical identity/snapshot policy and add consistency constraints/checks | High |
| DATA-P2-002 | P2 | Lifecycle integrity | Visit/deal/project procedures | Many state fields and multiple mutation paths | Invalid cross-field combinations may be possible | Workflow/reporting inconsistency | Define and centralize transition matrices; add negative/concurrency tests | Medium |
| DATA-P2-003 | P2 | Auditability | audit/timeline tables and mutation paths | Audit structures exist but complete coverage/immutability is unknown | Some changes may lack trustworthy history | Compliance and dispute-resolution gaps | Test audit emission for every sensitive mutation and protect history | Medium |
| DATA-P3-001 | P3 | Time consistency | schema event/month/year fields | Timestamps and derived month/year fields coexist | Period reporting may differ by timezone/backfill behavior | KPI/report discrepancies | Centralize timezone/period derivation and verify backfill rules | Medium |
| DATA-P3-002 | P3 | Duplicate rules | leads/visits/sales/payments schema | Few universal natural-key constraints visible | Retries may create duplicates | Duplicate operational/financial records | Document natural keys and idempotency strategy per workflow | Medium |

## 11. Audit Scope Note

This document records current evidence and risks only. No application source, schema, migration, dependency, configuration, authentication, authorization, or frontend behavior was modified.
