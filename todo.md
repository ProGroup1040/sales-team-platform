# Current Engineering Backlog

This file is the current source of truth for engineering work. The historical checklist is preserved at `docs/archive/todo-legacy.md`; it is not a status authority.

## Status definitions

| Status | Definition |
|---|---|
| Implemented | Code exists and local automated validation passes. |
| Partially verified | Code exists, but production infrastructure, migration, or end-to-end verification remains. |
| Open | Work is not complete. |
| Decision required | Product, finance, security, or data-owner approval is required before implementation. |

## Current acceptance matrix

| Area | Current status | Evidence | Next acceptance gate |
|---|---|---|---|
| Authentication and actor resolution | Partially verified | `server/_core/context.ts`, `server/_core/trpc.ts`, `server/localAuth.ts` | Test OAuth, local, and app-user sessions against production-like storage and revocation policy. |
| Server authorization | Partially verified | Protected/admin procedures and manual permission checks in `server/routers.ts` | Complete module/action/data-scope matrix tests for every operational query and mutation. |
| Database migrations | Partially verified | Active sequence through migration 0057; duplicate 0002 archived | Run clean and upgrade migrations against disposable and representative MySQL databases. |
| Database referential integrity | Partially verified | `drizzle/0057_enforce_core_relationships.sql` | Audit orphan rows, apply constraints, and verify soft-delete behavior. |
| Financial calculations | Partially verified | `shared/money.ts`, deal/payment transaction paths | Approve gross/net/collected/revenue policy and complete table-driven financial tests. |
| Transactional workflows | Partially verified | Transaction boundaries for deal closure, payments, and permission replacement | Add failure, retry, duplicate-request, and concurrency integration tests. |
| Frontend route protection | Implemented | `client/src/components/DashboardLayout.tsx` | Verify redirect and deep-link behavior in browser end-to-end tests. |
| Frontend bundle loading | Implemented | Lazy-loaded dashboard routes in `client/src/App.tsx` | Measure route budgets and confirm heavy PDF/report modules load on demand. |
| CI | Implemented | `.github/workflows/ci.yml` | Confirm GitHub Actions MySQL migration job passes on the repository. |
| Legacy sales model | Decision required | `customers`, `products`, `sales`, and `sale_items` remain in schema | Select active source of truth or approve migration/deprecation plan. |
| External integrations | Decision required | AI/storage/notification/REST integration code | Assign owners, define payload contracts, redact sensitive data, and document retry/fallback policy. |

## Priority order

P0 security and service-availability gates must be completed before production rollout. P1 financial consistency, migration verification, foreign keys, and transactional behavior follow immediately. P2 refactoring, performance, documentation, legacy-model decisions, and integration governance should be scheduled after the safety gates.

## Change control

Every completed row must link to code, tests, or an environment verification record. A requirement is not considered production-ready solely because it appears in a historical checklist or because the frontend hides a menu item.

## Deployment environment repair
- [x] Configure production-safe APP_JWT_SECRET fallback because the platform-managed JWT_SECRET cannot be edited directly.
- [x] Verify DATABASE_URL is available to the production service without exposing its value.
- [x] Redeploy and validate the production startup health check.

## Login recovery
- [x] Restore production runtime authentication using the application-owned production session secret fallback.
- [x] Verify local Admin UI sign-in, redirect to `/overview`, and authenticated identity in production.
- [x] Verify Admin Sales UI sign-in, redirect to `/overview`, and session persistence after a full reload in production.

## Authentication incident follow-up
- [x] Re-test the published credentials safely: both active administrative accounts are accepted by the production login endpoint.
- [x] Correct local-session cookie lifetime handling so an authenticated session follows the configured one-year policy rather than expiring prematurely.
- [x] Add and run focused unit coverage for the cookie-duration behavior without exposing passwords or session secrets.
- [x] Deploy the cookie-duration correction and verify the production cookie lifetime and sign-in flow.

## GitHub synchronization diagnosis
- [x] Verify local repository identity, branch, remotes, recent commits, and working-tree status against the requested GitHub repository without exposing credentials.
- [x] Test safe remote access and inspect the Manus GitHub integration configuration; classify the disabled connector and unavailable internal-remote credentials accurately.
- [ ] Preserve local engineering work and prepare a single reviewable checkpoint before attempting a branch push.
- [ ] Re-verify the enabled GitHub remote, branch ancestry, and working-tree status immediately before the final push.
- [ ] Push the verified implementation to the configured GitHub main branch and confirm the local and remote commit hashes match.

## Financial Dashboard — liquidity separation
- [x] Map every current Available Cash input and identify any direct or indirect contribution from Sales Forecast or weighted expected sales.
- [x] Implement the Available Cash equation using only current cash, confirmed incoming flows in the selected period, and due commitments or payments in the same period.
- [x] Preserve the existing Sales Forecast formula as a separate Forecast / Projected Financial Outlook indicator with no Available Cash contribution.
- [x] Add server-side validation and tests preventing duplicate recognition between forecast, scheduled incoming flows, actual collections, and current cash.
- [x] Present separate Available Cash and projected-outlook levels in the Financial Dashboard, then verify the selected-period calculations in the browser.
- [x] Document the liquidity-reservation model, source-of-truth hierarchy, and its relationships with sales, contracts, collections, procurement, production, and project timeline modules.
- [x] Add integration coverage proving a confirmed promise is removed from incoming flows by its linked collection, duplicate settlement is rejected, and commitment settlement creates one outflow only.
- [x] Harden payment recording so a confirmed promise cannot remain in incoming flows after an equivalent actual collection is recorded without an explicit promise link.
- [ ] Verify non-zero liquidity behavior in the browser across a selected period without persisting synthetic financial records to the production dataset.
- [x] Re-run the liquidity integration test, complete project test suite, TypeScript check, production build, and visual layout verification before final commit.
