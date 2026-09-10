# Backend Security Matrix

**Scope:** source-derived reconnaissance for the active backend-hardening work. This document records current enforcement and verified gaps; it is not a substitute for the server-side checks.

## Identity and session map

| Identity path | Session artifact | Role source | Lifecycle and current enforcement |
|---|---|---|---|
| Manus OAuth | `COOKIE_NAME` HttpOnly cookie | `users.role` from OAuth identity | OAuth callback creates a one-year session. Cookie duration is passed in milliseconds through the shared cookie contract. |
| Local engineer login | `local_session` HttpOnly cookie | `engineers.role` | Local JWT is verified per request. Inactive accounts are rejected by local-session verification. |
| Internal app user | `app_user_token` HttpOnly cookie | `app_users.role` | Seven-day JWT, with the account reloaded during token verification so inactive accounts and changed roles are rejected. Token signing now uses the application session-secret fallback. |

The request context selects a verified app-user session first, then a verified local session, then OAuth. `protectedProcedure` establishes an authenticated actor only; resource authorization remains procedure-specific.

Both local-engineer and app-user tokens now contain a positive **session version**. The server compares it with the persistent account version on every verified request and increments that version when a password, role, or account status changes. This invalidates older tokens immediately rather than waiting for their JWT expiry. The schema migration initializes existing accounts at version `1`, so all sessions issued before this deployment must sign in again once.

## Authorization matrix

| Procedure group | Operation | Required server-side rule | Ownership/data scope | Status |
|---|---|---|---|---|
| `localAuth.login`, `appUsers.login` | Authenticate | Public input validation plus DB-backed rate limiting | HMAC-derived address/account attempt key; no raw identifier stored | Enforced |
| `appUsers.*`, engineer account controls | Create/reset/enable accounts | Manager/Admin/Admin Sales may manage users; Manager/Admin only for Manager/Admin targets | Admin Sales is blocked from reset, status change, or creation against Manager/Admin engineer accounts | Enforced |
| `appUsers.updatePermissions` | Change permissions | User-management role plus target-role assignment check | Cannot edit privileged target role without privileged manager role | Enforced |
| `financial.allContracts` | Read contracts | Financial manager sees requested scope; non-manager is forced to own engineer scope | `collections.engineerId` | Enforced |
| `financial.clientProfile` | Read customer financial profile | Financial manager or assigned engineer | `collections.engineerId` | Enforced |
| `financial.addPayment`, `addPaymentWithFollowUp` | Record collection | Financial manager or assigned engineer | Collection assignment; client name and non-manager engineer ID come from the collection/context, not request input | Enforced |
| `financial.addPromise`, `updatePromise` | Manage payment promise | Financial manager or assigned engineer | Promise resolves through its collection | Enforced |
| `financial.confirmPromise`, liquidity, commitments, dashboards, alerts, commission overview | Company financial view/approval | Financial manager only | Organization-wide data | Enforced |
| `financial.setCashBalance`, commitments settlement/cancellation, contract state changes | Reconcile cash / commit spend | Existing `adminProcedure` | Organization-wide financial records | Enforced |
| Project Timeline mutations | Update execution projects | Admin/Admin Sales role checks | Project scope as implemented in Project Timeline module | Previously enforced; regression suite retained |
| Leads, visits, deals, tasks, planning, reporting | Remaining ownership/data-scope audit | Must be reviewed procedure by procedure before declaring full coverage | Varies by resource | In progress |

## Transport and browser protections

The Express application now sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, and a restrictive camera/geolocation/microphone policy on all responses. Production responses additionally send HSTS. A Content Security Policy was deliberately deferred until every dashboard asset and integration is inventoried; adding an untested CSP would create an avoidable availability risk.

## HTML rendering audit

The source audit found one `dangerouslySetInnerHTML` use in the shared chart component. It produces a local `<style>` block from developer-defined chart configuration and theme values; it does not render persisted customer, engineer, note, or report data. No other raw DOM insertion sink was found. PDF export captures the existing React report DOM through `html2canvas`; it does not parse an HTML string. No confirmed user-controlled HTML sink required a sanitization change in this phase.

## Financial integrity boundaries

| Source | Classification | Treatment in current cash calculation |
|---|---|---|
| Cash balance snapshot | Actual cash basis | Included once as the opening/current basis |
| Actual payment | Confirmed cash movement | Included once in `financial_cash_movements` and linked to payment source |
| Confirmed payment promise | Future incoming flow | Included only as a future confirmed flow; excluded once the promise is settled by a payment |
| Financial commitment | Reserved / due outflow | Reduces available cash while due; produces one outflow only on settlement |
| Sales forecast | Analytical projection | Visible as a separate forecast only; never added to Available Cash |

## Residual risks requiring explicit follow-up

1. The remaining lead, visit, task, deal, KPI, and report procedures still require a complete ownership/data-scope pass. Their existing `protectedProcedure` use alone is not evidence of authorization.
2. Historical monetary KPI and discount calculations outside the reconciled liquidity path still use JavaScript floating-point conversion in places. Any move to integer minor units must be staged and validated against existing reporting semantics.
3. Login throttling is MySQL-backed for horizontal deployment compatibility. It must be monitored for database availability and periodically pruned under operational retention policy.
4. Request correlation IDs, structured audit retention, and dependency remediation remain separate tasks. Existing build output still reports large client chunks, which is a performance concern rather than a correctness failure.
