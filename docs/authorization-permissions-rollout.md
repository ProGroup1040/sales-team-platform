# Authorization permissions rollout and rollback checklist

## Scope

This checklist applies to the single-source-of-truth authorization changes and migrations 0072/0073. It is a deployment checklist, not evidence that production has been inspected or changed.

## Before deployment

1. Confirm the final PR CI run is green, including the fresh MySQL migration chain and the isolated upgrade-fixture test.
2. Take a verified database backup/snapshot. The 0073 migration removes duplicate permission rows and canonicalizes `deals` to `closing`; a reverse SQL script cannot reconstruct every deleted duplicate.
3. Run the read-only [0072 admin permission impact report](sql/0072-admin-permission-impact-report.sql) against a production snapshot **before** migration. Review the affected accounts/modules and explicitly approve preserving the legacy `admin` default (full CRUD, `all` scope for missing user rows).
4. Confirm no active deployment is writing permission rows during the migration window.
5. Confirm `OAUTH_SERVER_URL` is set in the deployment environment if OAuth is enabled.

## Apply and verify

1. Apply migrations through the standard Drizzle deployment path; do not run the migration test against production.
2. Verify the migration journal records 0072 and 0073.
3. Verify there are no duplicate `(userId, module)` groups in `user_permissions`.
4. Verify no `deals` module rows remain and the unique constraint `user_permissions_user_module_unique` exists.
5. Smoke-test an admin account, a manager with own scope, and an ordinary user with explicit grants. Confirm the ordinary user cannot read or mutate another engineer's records by direct ID.
6. Keep the impact report, backup identifier, CI run URL, and smoke-test results in the release record.

## Rollback

- Stop the rollout if permission checks or migration verification fail.
- Restore the verified pre-migration database snapshot using the approved database recovery procedure. Do not attempt to reverse 0073 with ad-hoc SQL: deduplicated rows and legacy aliases cannot always be reconstructed.
- Roll back the application code to the last known-good release only after database compatibility has been assessed. Coordinate application and database rollback; do not assume a code-only rollback is safe.
