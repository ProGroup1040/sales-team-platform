-- One SQL statement so Drizzle's MySQL migration runner can execute it atomically.
-- Preserve existing per-user rows. Narrow legacy "team" scope to "own" because
-- user_permissions cannot represent team scope; never widen visibility here.
-- Existing admins previously received synthesized full access, so materialize
-- missing admin grants. Other roles are backfilled from role_permissions.
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
    SELECT 'crm' AS module UNION ALL
    SELECT 'visits' UNION ALL
    SELECT 'closing' UNION ALL
    SELECT 'kpi' UNION ALL
    SELECT 'planning' UNION ALL
    SELECT 'discounts' UNION ALL
    SELECT 'reports' UNION ALL
    SELECT 'tasks' UNION ALL
    SELECT 'collections' UNION ALL
    SELECT 'users' UNION ALL
    SELECT 'pricing_system'
  ) modules
  WHERE au.role = 'admin'

  UNION ALL

  SELECT
    au.id AS userId,
    CASE WHEN rp.module = 'deals' THEN 'closing' ELSE rp.module END AS module,
    MAX(rp.canView) AS canView,
    MAX(rp.canAdd) AS canAdd,
    MAX(rp.canEdit) AS canEdit,
    MAX(rp.canDelete) AS canDelete,
    CASE WHEN MAX(rp.dataScope = 'all') = 1 THEN 'all' ELSE 'own' END AS dataScope
  FROM app_users au
  JOIN role_permissions rp ON rp.role = au.role
  WHERE au.role <> 'admin'
    AND rp.module IN (
      'crm', 'visits', 'closing', 'deals', 'kpi', 'planning',
      'discounts', 'reports', 'tasks', 'collections', 'users', 'pricing_system'
    )
  GROUP BY au.id, CASE WHEN rp.module = 'deals' THEN 'closing' ELSE rp.module END
) grants
WHERE NOT EXISTS (
  SELECT 1
  FROM user_permissions up
  WHERE up.userId = grants.userId
    AND (
      up.module = grants.module
      OR (grants.module = 'closing' AND up.module = 'deals')
    )
)
