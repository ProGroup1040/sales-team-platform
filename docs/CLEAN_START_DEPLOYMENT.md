# Clean-start deployment (empty database)

This branch is based on the latest `main` commit and contains no database dump or production records. Git branches contain application code; the database is a separate service.

## Required hosting configuration

Set these in the hosting provider's private environment-variable settings (never in source code):

- `NODE_ENV=production`
- `DATABASE_URL`: connection string for a **new, empty MySQL-compatible database** reachable from the app service.
- `APP_JWT_SECRET`: unique random secret of at least 32 characters (64+ recommended).

Do not reuse a production database or put secrets in GitHub. Keep this clean-start database separate from the original Manus database.

## Build and start

- Build: `npm install && npm run build`
- Start: `npm run start`
- The host must pass its assigned port through `PORT`. Confirm the server binds to `process.env.PORT` before considering deployment complete.
- `GET /healthz` checks that the HTTP server started.
- `GET /readyz` checks that the MySQL connection can execute `SELECT 1`. A 503 from this endpoint means the database is not ready.

## Initialize the empty database safely

1. Create the empty database in the hosting provider or a MySQL provider.
2. Confirm `DATABASE_URL` is set to that database, not the old production database.
3. Review the checked-in migration chain under `drizzle/` before running any schema command.
4. Apply the repository's existing migrations using the project's approved migration procedure. Do not run `db:push` against any database that might contain existing data.
5. Verify `/readyz`, then test login, roles/permissions, and core create/read/update flows.

## Important limitations

Creating this branch does not provision a database, set hosting secrets, or switch the live service's deployment branch. Those actions require access to the hosting dashboard. Do not report the application as live until both `/healthz` and `/readyz` have been checked on the deployed URL.
