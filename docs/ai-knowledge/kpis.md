# KPI and Calculation Register

## Verified calculation families

| KPI family | Evidence | Formula status |
|---|---|---|
| Task operational score | `calcOperationalScoreFromTasks`, KPI procedures | Code-backed calculation; exact weights must be read from the function for each activity |
| Engineer performance | performance/KPI helpers and tests | Code-backed; do not infer a universal company formula |
| Follow-up compliance | `getFollowupKPI`, `getFollowupComplianceReport` | Code-backed; date/status filters are implementation-specific |
| Sales/closing metrics | deals, targets, commission helpers | Several measures exist; canonical revenue measure is UNKNOWN |
| Financial totals | `shared/money.ts`, settlement functions | Integer cents at calculation boundaries; database storage is decimal |

## Traceability rule

A dashboard number must be traced from the UI query to its tRPC procedure, helper, query, source fields, filters, and rounding. Do not equate collected cash with recognized revenue: `docs/architecture-and-operations.md` explicitly separates them.

## Gaps

The repository does not establish one organization-wide KPI catalog, timezone policy, target approval policy, or missing-data policy. Those are **UNKNOWN** until product/finance policy or executable evidence is added.
