-- One SQL statement so Drizzle's MySQL migration runner can execute it atomically.
-- Preserve existing per-user rows. Narrow legacy "team" scope to "own" because
-- user_permissions cannot represent team scope; never widen visibility here.
-- Existing admins previously received synthesized full access, so materialize
-- missing admin grants. Other roles are backfilled from role_permissions.
-- Explicit utf8mb4_unicode_ci literals keep this compatible with databases whose
-- connection collation differs from the permission tables' collation.
INSERT INTO user_permissions
  (userId, module, canView, canAdd, canEdit, canDelete, dataScope, createdAt, updatedAt)
SELECT
  grants.userId,
  grants.module,
  grants.canView,
  grants.canAdd,
  grants.canEdit,
  grants.canDelete,
  grants.dataScope,
  NOW(),
  NOW()
FROM (
  SELECT
    au.id AS userId,
    modules.module AS module,
    1 AS canView,
    1 AS canAdd,
    1 AS canEdit,
    1 AS canDelete,
    'all' AS dataScope
  FROM app_users au
  CROSS JOIN (
    SELECT CONVERT('crm' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS module UNION ALL
    SELECT CONVERT('visits' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('closing' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('kpi' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('planning' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('discounts' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('reports' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('tasks' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('collections' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('users' USING utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
    SELECT CONVERT('pricing_system' USING utf8mb4) COLLATE utf8mb4_unicode_ci
  ) modules
  WHERE au.role = CONVERT('admin' USING utf8mb4) COLLATE utf8mb4_unicode_ci

  UNION ALL

  SELECT
    au.id AS userId,
    CASE WHEN rp.module = CONVERT('deals' USING utf8mb4) COLLATE utf8mb4_unicode_ci
      THEN CONVERT('closing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
      ELSE rp.module END AS module,
    MAX(rp.canView) AS canView,
    MAX(rp.canAdd) AS canAdd,
    MAX(rp.canEdit) AS canEdit,
    MAX(rp.canDelete) AS canDelete,
    CASE WHEN MAX(rp.dataScope = CONVERT('all' USING utf8mb4) COLLATE utf8mb4_unicode_ci) = 1 THEN 'all' ELSE 'own' END AS dataScope
  FROM app_users au
  JOIN role_permissions rp ON rp.role = au.role
  WHERE au.role <> CONVERT('admin' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    AND rp.module IN (
      CONVERT('crm' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('visits' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('closing' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('deals' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('kpi' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('planning' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('discounts' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('reports' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('tasks' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('collections' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('users' USING utf8mb4) COLLATE utf8mb4_unicode_ci,
      CONVERT('pricing_system' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    )
  GROUP BY au.id, CASE WHEN rp.module = CONVERT('deals' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    THEN CONVERT('closing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    ELSE rp.module END
) grants
WHERE NOT EXISTS (
  SELECT 1
  FROM user_permissions up
  WHERE up.userId = grants.userId
    AND (
      up.module = grants.module
      OR (grants.module = CONVERT('closing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
        AND up.module = CONVERT('deals' USING utf8mb4) COLLATE utf8mb4_unicode_ci)
    )
);
