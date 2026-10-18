-- Read-only pre-deployment impact report for migration 0072.
-- Run against a production snapshot BEFORE applying migrations 0072/0073.
-- This query does not modify data. Review the output with product/security owners.

SELECT
  au.id AS admin_user_id,
  au.username,
  au.name,
  modules.module AS module,
  CASE
    WHEN up.id IS NULL THEN 'WOULD_BACKFILL_LEGACY_ADMIN_DEFAULT'
    ELSE 'EXISTING_USER_ROW_PRESERVED'
  END AS migration_action,
  up.canView AS existing_can_view,
  up.canAdd AS existing_can_add,
  up.canEdit AS existing_can_edit,
  up.canDelete AS existing_can_delete,
  up.dataScope AS existing_data_scope
FROM app_users AS au
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
) AS modules
LEFT JOIN user_permissions AS up
  ON up.userId = au.id
  AND up.module = modules.module
WHERE au.role = 'admin'
ORDER BY au.id, modules.module;
