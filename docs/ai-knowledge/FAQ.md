# Employee FAQ

## How does the platform work?
React pages call typed tRPC procedures; protected procedures resolve the actor, validate input, execute database helpers, and update React Query caches.

## Can a regular user add a task?
Yes, if the account is linked to an engineer and task add permission is enabled. The UI uses `tasks.createMine`; the server derives the owner from the session.

## Can a regular user assign a task to someone else?
No for own scope. The server ignores client ownership for `createMine` and rejects access to another engineer's task.

## What counts as completed?
`completed` is an implemented task status. The full KPI impact is not universally documented; consult the relevant KPI helper.

## What happens when a task is deleted?
The platform uses a soft-delete pattern for tasks; list and aggregate queries should exclude `isDeleted` records.

## How are permissions applied?
Task endpoints use `getTaskAccess`/`requireTaskAction`; other modules may use role guards, protected/admin procedures, or section permissions. Do not assume a UI toggle alone is security enforcement.

## What is the difference between Engineer and System User?
An engineer is an operational owner record. A system/app user is a login identity that may link to an engineer. The relationship is optional in the schema.

## Where does a KPI number come from?
Trace the page query to its tRPC procedure, helper, source table, filters, and rounding. If a source is not identified, the answer must be marked UNKNOWN.

## Are visits and total visits always the same?
They should use the same period and soft-delete filters, but the exact production result requires inspecting the deployed query and database state.
