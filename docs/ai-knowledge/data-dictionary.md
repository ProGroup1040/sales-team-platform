# Data Dictionary (Core Entities)

| Table/entity | Purpose | Key fields | Evidence |
|---|---|---|---|
| `users` | OAuth identity | `id`, `openId`, `role` | `drizzle/schema.ts` |
| `engineers` | operational people and task owners | `id`, `department`, `role`, status, credentials | schema/local auth |
| `appUsers` | internal login accounts | username, role, `engineerId`, status | schema/auth |
| `dailyTasks` | date-based work records | `engineerId`, `taskDate`, title, status, priority, `isDeleted` | schema/task router |
| `leads` | prospects and assignment | contact fields, status, assigned engineer | schema/Leads module |
| `visits` | scheduled consultations | lead/engineer links, schedule and lifecycle fields | schema/Visits module |
| `deals` | closing/pipeline records | lead/visit/engineer links, stage and values | schema/Closing module |
| `collections`, `payments`, `paymentPromises` | financial collection records | amount/status/date/owner fields | schema/finance helpers |
| `monthlyTargets`, `engineerTargets` | goals and targets | period, target, engineer | schema/KPI helpers |
| `rolePermissions`, `userPermissions`, `sectionPermissions` | authorization configuration | role/user/module/scope and CRUD flags | permissions routers |
| project timeline tables | post-sale execution tracking | project, stage, movement, delay, update, audit fields | schema/timeline router |

Soft-delete flags and audit fields exist on multiple entities. Complete foreign-key, cascade, retention, and canonical identity policy are **UNKNOWN** and documented in `docs/data-integrity-audit.md`.
