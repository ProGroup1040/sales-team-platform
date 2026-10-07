INSERT INTO `role_permissions` (`role`, `module`, `canView`, `canAdd`, `canEdit`, `canDelete`, `dataScope`)
SELECT seeds.`role`, seeds.`module`, seeds.`canView`, seeds.`canAdd`, seeds.`canEdit`, seeds.`canDelete`, seeds.`dataScope`
FROM (
  SELECT 'admin' AS `role`, 'pricing_system' AS `module`, 1 AS `canView`, 1 AS `canAdd`, 1 AS `canEdit`, 1 AS `canDelete`, 'all' AS `dataScope`
  UNION ALL SELECT 'manager', 'pricing_system', 1, 0, 0, 0, 'all'
  UNION ALL SELECT 'admin_sales', 'pricing_system', 1, 0, 0, 0, 'all'
  UNION ALL SELECT 'sales_engineer', 'pricing_system', 1, 0, 0, 0, 'own'
  UNION ALL SELECT 'sales_specialist', 'pricing_system', 1, 0, 0, 0, 'own'
) AS seeds
LEFT JOIN `role_permissions` existing
  ON existing.`role` = seeds.`role` AND existing.`module` = seeds.`module`
WHERE existing.`id` IS NULL;
