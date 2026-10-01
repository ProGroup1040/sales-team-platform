# Architecture

## Verified stack

| Layer | Implementation | Evidence |
|---|---|---|
| UI | React 19 + TypeScript + Vite | `package.json`, `client/` |
| Routing | Wouter and lazy page modules | `client/src/App.tsx` |
| API | Express + tRPC 11 + SuperJSON | `server/_core/index.ts`, `server/routers.ts` |
| Database | MySQL via Drizzle ORM/mysql2 | `drizzle/schema.ts`, `server/db.ts` |
| Validation | Zod router inputs | `server/routers.ts` |
| Auth | OAuth plus local/app-user sessions | `server/_core/context.ts`, `server/localAuth.ts` |
| Tests | Vitest | `server/*.test.ts`, `vitest.config.ts` |

## Request lifecycle

```text
React page -> tRPC client -> Express /api/trpc -> context/actor
-> protected/admin procedure -> router -> db helper -> Drizzle/MySQL
-> React Query invalidation/refetch -> UI
```

## Domains

CRM (leads, visits, engineers), daily tasks, closing/deals, finance/collections, KPI/reporting, playbook/meetings, permissions/user management, and post-sale project timeline are confirmed implementation areas. The large `server/db.ts` remains a compatibility facade.

Production deployment state, database contents, timezone policy, retention, and organization policy are **UNKNOWN** unless evidenced by repository files or tests.
