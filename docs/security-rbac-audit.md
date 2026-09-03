# Security and RBAC Audit

## 1. Authentication Architecture

The repository has multiple authentication paths. Manus/OAuth creates or resolves a base `users` record and an `app_session_id` cookie. Local engineer authentication uses username/password, bcrypt password hashes, a signed JWT, and a `local_session` cookie. App-user authentication also exists in database helpers and router procedures. `server/_core/context.ts` attempts to resolve the current request into an actor from these sources.

| Path | Identity store | Credential/token | Cookie/session | Evidence |
|---|---|---|---|---|
| OAuth | `users` | OAuth provider token exchanged by SDK | `app_session_id` | `server/_core/oauth.ts`, `server/_core/sdk.ts` |
| Local engineer | `engineers` | bcrypt password hash + JWT | `local_session` | `server/localAuth.ts` |
| App user | `appUsers` | app-user credential/JWT path | app-user cookie path | `server/db.ts`, `server/routers.ts`, `shared/const.ts` |

The authentication architecture is **functional but fragmented**. The repository does not establish a canonical account-linking policy between `users`, `engineers`, and `appUsers`. Identity overlap, duplicate accounts, and different logout/revocation semantics therefore remain security risks rather than confirmed incidents.

## 2. Identity Model

The current actor is not simply one row type. OAuth-oriented users have `openId`, while engineers have role, department, username, password hash, status, soft-delete state, and forced-password-change fields. App users are separately represented. Context resolution normalizes the request to an actor-like object, but the source identity and database record are not globally unified.

Confirmed behaviors include active/deleted checks in local account paths, bcrypt hashing with cost 12 in `server/localAuth.ts`, JWT signing/verification using `jose`, and a forced password-change flag on engineers. OAuth sessions are configured with a one-year default expiry in `shared/const.ts`/`server/_core/sdk.ts`. The exact app-user token lifetime, revocation store, account-linking behavior, password reset policy, and token rotation policy are **Unknown / Needs Verification**.

Cookie helpers set `httpOnly`, `path=/`, `sameSite=none`, and a `secure` value based on the request or forwarded protocol in `server/_core/cookies.ts`. Because `sameSite=none` normally requires `secure` in browsers, proxy/header configuration should be verified in every deployment. No complete CSRF strategy or rate-limiting policy was established by repository evidence.

## 3. Authorization Architecture

Authorization has four overlapping mechanisms:

1. `publicProcedure`, `protectedProcedure`, and `adminProcedure` in `server/_core/trpc.ts`.
2. Shared role predicates and role-management helpers in `shared/authorization.ts`.
3. Stored permission structures in `userPermissions`, `rolePermissions`, and `sectionPermissions`.
4. Manual role, manager, admin, department, or ownership checks inside selected router/database operations.

This layered approach provides useful defense in depth where consistent, but it also creates policy drift risk. The frontend’s module visibility and route placement inside `DashboardLayout` are not a server-side authorization proof.

## 4. Role Matrix

`shared/authorization.ts` explicitly lists the following application roles: `admin`, `engineer`, `admin_sales`, `sales_engineer`, `tele_sales`, `site_engineer`, `system_user`, `sales_specialist`, `interior_designer`, `manager`, and `group_admin`.

| Role group | Confirmed meaning/privilege evidence | Caveat |
|---|---|---|
| `admin`, `manager`, `system_user` | Included in manager-role predicate | Exact module scope is not globally documented. |
| `sales_engineer`, `engineer`, `sales_specialist` | Included in sales-role predicate | Ownership/department scope varies by procedure. |
| `manager`, `admin_sales`, `admin` | `canManageUsers` returns true | This is a helper policy, not proof every sensitive operation uses it. |
| `manager`, `admin` | Allowed to manage privileged roles by helper | Promotion/admin assignment should be tested per procedure. |
| Other listed roles | Stored/enum-supported roles | Complete read/write scope is **Unknown / Needs Verification**. |

## 5. Permission Matrix

The repository defines modules for overview, tasks, CRM, visits, closing, sales, KPI, collections, planning, reports, sales execution, promotion, users, and permissions. Stored permission rows include view/add/edit/delete-style capabilities and a data-scope concept in the schema and user-permission update logic.

| Module/domain | Authentication gate | Role/permission evidence | Ownership/department evidence | Audit conclusion |
|---|---|---|---|---|
| Users | Protected; sensitive mutations manually restricted | `canManageUsers`, privileged role helper, app-user procedures | Target-user checks exist in selected paths | Complete matrix requires procedure-by-procedure verification. |
| Roles/permissions | Protected/admin-like and manual checks | role/section permission procedures | Admin/manager concepts present | High-risk policy is distributed. |
| Leads/follow-up | Protected procedures | Sales/manager checks in selected paths | Assigned engineer fields exist | Ownership consistency needs verification. |
| Visits | Protected procedures | Role checks and visit operations | Engineer/admin-sales assignments exist | Sensitive mutations need full matrix. |
| Deals/discounts | Protected procedures | Closing/discount helpers and role checks | Engineer ownership fields exist | Discount authorization/finalization policy is incomplete. |
| Sales/payments/collections | Protected procedures | Financial paths use guards and selected manual checks | Engineer/contract associations exist | Treat as high risk; confirm every mutation. |
| Commissions/goals | Protected procedures | Manager/sales role concepts | Engineer targets and evaluation records exist | Exact approver/finalizer is unknown. |
| Projects | Protected procedures | Project timeline permission tests and scope checks | Project/deal ownership scope exists | Stronger evidence than several other modules, but not complete. |
| Tasks/reports | Protected procedures | Task and report route/procedure access | Engineer assignment/date scope exists | Read scope and export sensitivity need verification. |

This matrix is an audit summary, not a claim that each row has identical enforcement. The required next artifact is a generated procedure-level matrix with one row per mutation and sensitive read.

## 6. Sensitive Procedures

The highest-risk procedure families are `appUsers.*`, `rolePermissions.*`, `sectionPermissions.*`, `financial.*`, `closing.*`, `sales.*`, `softDelete.*`, `projectTimeline.*`, `promotion.*`, and target/permission-changing planning procedures. Client consumers exist for many of these families, and server tests cover selected behavior.

| Risk class | Procedure families | Required control checks |
|---|---|---|
| Critical business data | `financial.addPayment*`, `financial.settleCommitment`, `financial.confirmPromise`, `collections.*` | Auth, role/permission, target ownership, idempotency, transaction, immutable audit. |
| Deal/discount | `closing.create`, `closing.updateStage`, `closing.updateDealStage`, discount tier procedures | Auth, role, stage transition, discount authority, transaction, audit. |
| Account administration | `appUsers.create/update/resetPassword/toggleStatus/updatePermissions`, role/section updates | Privileged role assignment, self/target restrictions, audit, password/session revocation. |
| Destructive operations | `softDelete.*`, deletion procedures | Auth, reason, scope, audit, restoration/retention policy. |
| Project control | `projectTimeline.transition/setHold/close/addDelay/updateStageConfig` | Project scope, role, transition policy, audit, transaction. |
| Promotion/commission | `promotion.promoteEngineer`, evaluation/review, commission/tier updates | Manager authority, immutable history, approval/finalization. |

## 7. Ownership Rules

Ownership is represented through fields such as `engineerId`, `assignedEngineerId`, `userId`, `dealId`, `projectId`, and related assignment fields. Some procedures enforce actor/role/department scope, especially in project timeline and user-management areas. A complete universal ownership rule was not established.

The principal risk is inconsistent interpretation of “manager,” “assigned engineer,” “admin sales,” and “actor.” A user may be authenticated while still lacking the correct ownership or department boundary. This must be proven per procedure, especially for financial reads, exports, user lists, project timelines, and reports.

## 8. Security Findings

| ID | Severity | Category | Location | Evidence | Actual behavior | Risk/impact | Recommended remediation | Confidence |
|---|---|---|---|---|---|---|---|---|
| SEC-P1-001 | P1 | Identity fragmentation | `server/_core/context.ts`, `server/localAuth.ts`, `server/db.ts` | Three identity concepts and multiple cookies/JWT/OAuth paths | Actor resolution selects among heterogeneous identities | Account overlap, inconsistent revocation, and policy drift | Define canonical actor and explicit account-linking/revocation rules before changes | High |
| SEC-P1-002 | P1 | Authorization consistency | `shared/authorization.ts`, `server/_core/trpc.ts`, `server/routers.ts` | Guards, stored permissions, and manual checks coexist | No single authoritative matrix is visible | Missing or conflicting checks may overexpose sensitive operations | Generate/test a server-side procedure matrix and centralize policy gradually | High |
| SEC-P1-003 | P1 | Critical write failure | `server/db.ts:73-93` | `upsertUser` returns when db is absent | An auth-related write can be skipped without an exception | False success and inconsistent authenticated state | Fail closed for critical persistence and add regression tests | High |
| SEC-P2-001 | P2 | Session/CSRF configuration | `server/_core/cookies.ts` | `SameSite=None`; secure inferred from request headers | Correctness depends on proxy protocol handling | Cross-site request/session risk if deployment headers are wrong | Verify proxy trust, enforce secure production cookies, document CSRF controls | Medium |
| SEC-P2-002 | P2 | Account lifecycle | local/app-user auth modules | Password reset/revocation and token invalidation are not globally documented | Existing tokens may not be uniformly revoked after account changes | Stale access after disable/reset | Define token version/revocation behavior and test it across all auth paths | Medium |
| SEC-P3-001 | P3 | Rate limiting | Repository-wide search | No confirmed rate-limit middleware/policy | Brute-force/abuse controls may be absent | Add deployment-appropriate rate limiting and monitoring | Medium |
| SEC-P3-002 | P3 | Security observability | Server logging | Console logging exists; structured security event pipeline not proven | Suspicious access may be difficult to detect | Add structured authz/authn audit events without secrets/PII leakage | Medium |

## 9. Prioritized Security Risks

There is no P0 assignment because static evidence did not prove an active exploitable production breach or inevitable data loss. P1 risks must be addressed before expanding sensitive functionality: unify/document actor resolution, ensure critical writes fail closed, and produce the complete server-side authorization matrix. P2 work should verify cookie/proxy/CSRF behavior and account lifecycle revocation. P3 work should improve rate limiting and security observability.

## 10. Recommended Remediation

1. Inventory every auth source, cookie, token, identity table, and logout/reset path.
2. Decide the canonical actor/account-linking model and document overlap handling.
3. Build a procedure-level authorization matrix for every sensitive read and mutation, including role, stored permission, ownership, department, and manager/admin checks.
4. Add negative authorization tests and cross-account/department tests.
5. Make authentication and financial persistence fail closed on database failure.
6. Verify production cookie attributes, proxy protocol handling, CSRF protection, token expiry, rotation, and revocation.
7. Add rate limiting and structured security telemetry.

## Audit Scope Note

This document is an audit artifact only. No application source, schema, migration, dependency, authentication, authorization, or frontend behavior was modified.
