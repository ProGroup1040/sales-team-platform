# Operational Mutation Permission Matrix

## Purpose

This document is the human-reviewable companion to `OPERATION_PERMISSION_OVERRIDES` in `server/_core/trpc.ts`. Every mutation in an operational namespace must have an explicit entry. An unclassified operational mutation is denied; there is no name-based fallback to `canEdit`.

- `canAdd`: operation creates/adds a record.
- `canEdit`: operation changes an existing record or state.
- `canDelete`: operation deletes, removes, or cancels a record/commitment.
- `canAdd + canEdit`: upsert/synchronization operation may create **or** modify a record and therefore requires both grants.

This matrix records the current implementation, not a substitute for reviewing the underlying handler and confirming business intent. Changes to a route's business behavior must update the code and this matrix together. It does not cover namespaces with dedicated authorization boundaries (`auth`, `localAuth`, `appUsers`, `pushNotifications`, `seed`, `rolePermissions`, `sectionPermissions`, and `system`).

## Additional handler-level gates (2026-10-19)

The operation-grant matrix above describes the required module/action permission. These additional guards apply to sensitive writes and linked records:

- `closing.updateStage`: supplying `accountingMonth` or `accountingYear` requires an authenticated local session with the `admin` or `manager` role; this prevents bypassing `closing.setAccountingMonth`.
- `closing.setDiscountCap`, `sales.setEngineerTarget`, `sales.setOperationalTargets`, and `sales.upsertDiscountTier`, `sales.deleteDiscountTier`, `sales.upsertCommissionTier`, and `sales.deleteCommissionTier` require a financial-management role and `closing: all` scope.
- `visits.create` validates the optional `leadId`; `closing.create` validates linked lead/visit IDs; `session.create` validates linked deal/quotation IDs; `financial.addContract` validates a supplied deal ID; `dealTasks.create` and `playbook.createQuotation` validate linked deals.
- `closing.validateDiscount` calculates the remaining budget using the authorized engineer scope for `own` users; team-wide budget calculations are retained for `all` scope.
- Shared product and Playbook catalog writes require both a financial-management role and `pricing_system: all`; own-scope write grants cannot mutate shared records.
- Project timeline ownership checks use a read-only query before rejecting access, avoiding runtime recalculation writes on another engineer's project.

These guards supplement rather than replace the module/action permission requirement. MySQL-backed tests cover representative allowed-own and denied-foreign cases; see the follow-up execution table in the authorization audit.

## Matrix

| Procedure | Module | Required grant(s) |
|---|---|---|
| `adminSalesTasks.create` | `tasks` | canAdd |
| `adminSalesTasks.updateFull` | `tasks` | canEdit |
| `adminSalesTasks.updateStatus` | `tasks` | canEdit |
| `adminSalesTasks.updateWeekMeeting` | `tasks` | canEdit |
| `closing.autoCreateFromTask` | `closing` | canAdd + canEdit |
| `closing.create` | `closing` | canAdd |
| `closing.reopen` | `closing` | canEdit |
| `closing.setAccountingMonth` | `closing` | canEdit |
| `closing.setDiscountCap` | `closing` | canEdit |
| `closing.updateDealStage` | `closing` | canEdit |
| `closing.updateEngineer` | `closing` | canEdit |
| `closing.updateStage` | `closing` | canEdit |
| `collections.create` | `collections` | canAdd |
| `collections.update` | `collections` | canEdit |
| `customers.create` | `crm` | canAdd |
| `customers.delete` | `crm` | canDelete |
| `customers.update` | `crm` | canEdit |
| `dealTasks.create` | `closing` | canAdd |
| `dealTasks.markDone` | `closing` | canEdit |
| `engineers.create` | `tasks` | canAdd |
| `financial.addCommitment` | `collections` | canAdd |
| `financial.addContract` | `collections` | canAdd |
| `financial.addPayment` | `collections` | canAdd |
| `financial.addPaymentWithFollowUp` | `collections` | canAdd |
| `financial.addPromise` | `collections` | canAdd |
| `financial.autoCreateContract` | `collections` | canAdd |
| `financial.cancelCommitment` | `collections` | canDelete |
| `financial.confirmPromise` | `collections` | canEdit |
| `financial.markCommissionPaid` | `collections` | canEdit |
| `financial.setCashBalance` | `collections` | canEdit |
| `financial.settleCommitment` | `collections` | canEdit |
| `financial.updateContractStatus` | `collections` | canEdit |
| `financial.updatePromise` | `collections` | canEdit |
| `leadDailyStats.upsert` | `crm` | canAdd + canEdit |
| `leadFollowup.log` | `crm` | canAdd |
| `leads.create` | `crm` | canAdd |
| `leads.updateStatus` | `crm` | canEdit |
| `meetingReview.submitLink` | `tasks` | canEdit |
| `meetingReview.upsertReview` | `tasks` | canAdd + canEdit |
| `pipeline.approveDiscount` | `closing` | canEdit |
| `pipeline.computeBonus` | `closing` | canAdd + canEdit |
| `planning.applyDistribution` | `planning` | canAdd + canEdit |
| `planning.manualOverride` | `planning` | canEdit |
| `planning.setCompanyGoal` | `planning` | canAdd + canEdit |
| `planning.setPersonalGoal` | `planning` | canAdd + canEdit |
| `planning.setTarget` | `planning` | canAdd + canEdit |
| `playbook.create` | `pricing_system` | canAdd |
| `playbook.createQuotation` | `pricing_system` | canAdd |
| `playbook.delete` | `pricing_system` | canDelete |
| `playbook.import` | `pricing_system` | canAdd |
| `playbook.update` | `pricing_system` | canEdit |
| `playbook.updateRecording` | `pricing_system` | canEdit |
| `playbook.updateStatus` | `pricing_system` | canEdit |
| `products.create` | `pricing_system` | canAdd |
| `products.delete` | `pricing_system` | canDelete |
| `products.update` | `pricing_system` | canEdit |
| `projectTimeline.addDelay` | `tasks` | canAdd |
| `projectTimeline.close` | `tasks` | canEdit |
| `projectTimeline.importHistorical` | `tasks` | canAdd |
| `projectTimeline.setHold` | `tasks` | canEdit |
| `projectTimeline.startExecution` | `tasks` | canEdit |
| `projectTimeline.syncFromDeals` | `tasks` | canAdd + canEdit |
| `projectTimeline.transition` | `tasks` | canEdit |
| `projectTimeline.update` | `tasks` | canEdit |
| `projectTimeline.updatePreExecution` | `tasks` | canEdit |
| `projectTimeline.updateStageConfig` | `tasks` | canEdit |
| `promotion.createMeetingReview` | `kpi` | canAdd + canEdit |
| `promotion.createMonthlyEvaluation` | `kpi` | canAdd + canEdit |
| `promotion.promoteEngineer` | `kpi` | canEdit |
| `sales.deleteCommissionTier` | `closing` | canDelete |
| `sales.deleteDiscountTier` | `closing` | canDelete |
| `sales.setEngineerTarget` | `closing` | canAdd + canEdit |
| `sales.setOperationalTargets` | `closing` | canAdd + canEdit |
| `sales.upsertCommissionTier` | `closing` | canAdd + canEdit |
| `sales.upsertDiscountTier` | `closing` | canAdd + canEdit |
| `session.create` | `tasks` | canAdd |
| `session.end` | `tasks` | canEdit |
| `session.logAction` | `tasks` | canAdd |
| `session.updateRecording` | `tasks` | canEdit |
| `softDelete.deal` | `closing` | canDelete |
| `softDelete.engineer` | `tasks` | canDelete |
| `softDelete.lead` | `crm` | canDelete |
| `softDelete.task` | `tasks` | canDelete |
| `softDelete.visit` | `visits` | canDelete |
| `tasks.create` | `tasks` | canAdd |
| `tasks.createEngineer` | `tasks` | canAdd |
| `tasks.createMine` | `tasks` | canAdd |
| `tasks.createWithTime` | `tasks` | canAdd |
| `tasks.delete` | `tasks` | canDelete |
| `tasks.deleteEngineer` | `tasks` | canDelete |
| `tasks.moveTask` | `tasks` | canEdit |
| `tasks.reschedule` | `tasks` | canEdit |
| `tasks.submitRecording` | `tasks` | canEdit |
| `tasks.updateEngineerProfile` | `tasks` | canEdit |
| `tasks.updateFull` | `tasks` | canEdit |
| `tasks.updateStatus` | `tasks` | canEdit |
| `visits.create` | `visits` | canAdd |
| `visits.softDelete` | `visits` | canDelete |
| `visits.updateFull` | `visits` | canEdit |
| `visits.updateStatus` | `visits` | canEdit |
| `workDist.log` | `tasks` | canAdd |

## Coverage

- Explicitly classified operational mutations in this matrix: **101**.
- The static test `server/authorization-inventory.test.ts` scans the router declarations and fails if a mutation in a mapped operational namespace has no explicit classification.
- Query and subscription procedures require `canView` by default.
- This matrix governs module/CRUD action only. Record-level `own/all` enforcement is a separate requirement and remains under audit.
- GitHub Actions must pass before this implementation can be considered verified; this document does not claim that tests have run locally.
