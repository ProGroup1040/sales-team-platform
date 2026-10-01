# Module Map

| Module | UI evidence | Backend/data evidence | Status |
|---|---|---|---|
| Overview/Dashboard | `Overview`, dashboard routes | aggregate/KPI procedures | VERIFIED |
| Daily Tasks | `client/src/pages/TasksModule.tsx` | `tasks.*`, `dailyTasks` | VERIFIED |
| Leads | `LeadsModule.tsx` | leads/follow-up helpers | VERIFIED |
| Visits | `VisitsModule.tsx` | visits procedures and table | VERIFIED |
| Closing | `ClosingModule.tsx` | deals, discounts, deal tasks | VERIFIED |
| KPI/Reports | KPI and Reports pages | KPI/report calculation helpers | VERIFIED |
| Collections/Finance | Collections page | collections, payments, promises | VERIFIED |
| Planning/Execution | Planning and Sales Execution pages | playbooks, meetings, targets | VERIFIED |
| Project Timeline | `ProjectTimelineModule.tsx` | projects, stages, movements, delays | VERIFIED |
| Users/Permissions | User Management and Permissions pages | app users, role/user/section permissions | VERIFIED |

Module boundaries and route registration are evidenced by `client/src/App.tsx`, `server/routers.ts`, and `drizzle/schema.ts`. Exact product ownership between some legacy sales tables and current closing tables is **UNKNOWN**.
