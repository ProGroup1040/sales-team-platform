# End-to-End Workflows

## Daily task creation

1. User opens Tasks module.
2. `AddTaskDialog` collects date, title, type, priority, hours, and optional recording link.
3. tRPC calls `tasks.create` for privileged users; regular linked users call `tasks.createMine`.
4. `requireTaskAction(ctx, "add")` checks effective task permission and scope.
5. `createMine` derives `engineerId` from the authenticated actor; it does not trust a client-supplied owner.
6. `createTask` writes `dailyTasks`; success invalidates task queries and refreshes UI.

## Task status

Confirmed statuses are `planned`, `completed`, `delayed`, `not_done`, and `client_delay` in schema/router inputs. The complete business transition policy and KPI treatment of every transition are **UNKNOWN** unless a specific calculation/test proves it.

## Visit lifecycle

The Visits UI calls typed visit procedures, which validate inputs, persist booking/confirmation/execution/upload/quality and deletion fields, and invalidate list/stat queries. Visit state dimensions are confirmed; a single canonical cross-field state machine is **UNKNOWN**.

## Financial mutation

Financial procedures use decimal database fields and selected cents-based helpers in `shared/money.ts`. Transaction coverage is present in selected settlement and lifecycle paths, but universal idempotency and reconciliation policy are **UNKNOWN**.

## Evidence rule

The workflow above describes implementation paths, not undocumented business intent. For any answer about approval, revenue recognition, ownership, or SLA, consult `server/routers.ts`, `server/db.ts`, schema, and tests before asserting a rule.
