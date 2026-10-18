-- One-time backfill: materialize currently effective role grants into user_permissions.
-- Existing per-user rows always win. The "team" scope is intentionally narrowed
-- to "own" because user_permissions does not represent team scope; do not widen
-- data visibility during migration.
--
-- Admins previously received synthesized full module access even when role rows
-- were missing, so materialize that legacy effective access unless a direct row
-- already exists (including an explicit deny).
INSERT INTO user_permissions
  (userId, module, canView, canAdd, canEdit, canDelete, dataScope, createdAt, updatedAt)
SELECT
  au.id, modules.module, 1, 1, 1, 1, 'all', NOW(), NOW()
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
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.userId = au.id
      AND (up.module = modules.module
        OR (modules.module = 'closing' AND up.module = 'deals'))
  );

-- For non-admin accounts, copy role-level grants only where no explicit
-- user-level row exists. Normalize the legacy "deals" alias to "closing".
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
  SELECT 1 FROM user_permissions up
  WHERE up.userId = grants.userId
    AND (up.module = grants.module
      OR (grants.module = 'closing' AND up.module = 'deals'))
);
