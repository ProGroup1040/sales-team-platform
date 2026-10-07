INSERT INTO `role_permissions` (`role`, `module`, `canView`, `canAdd`, `canEdit`, `canDelete`, `dataScope`)
SELECT 'manager', 'pricing_system', 1, 0, 0, 0, 'all'
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role` = 'manager' AND `module` = 'pricing_system');
INSERT INTO `role_permissions` (`role`, `module`, `canView`, `canAdd`, `canEdit`, `canDelete`, `dataScope`)
SELECT 'admin_sales', 'pricing_system', 1, 0, 0, 0, 'all'
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role` = 'admin_sales' AND `module` = 'pricing_system');
INSERT INTO `role_permissions` (`role`, `module`, `canView`, `canAdd`, `canEdit`, `canDelete`, `dataScope`)
SELECT 'sales_engineer', 'pricing_system', 1, 0, 0, 0, 'own'
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role` = 'sales_engineer' AND `module` = 'pricing_system');
INSERT INTO `role_permissions` (`role`, `module`, `canView`, `canAdd`, `canEdit`, `canDelete`, `dataScope`)
SELECT 'sales_specialist', 'pricing_system', 1, 0, 0, 0, 'own'
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role` = 'sales_specialist' AND `module` = 'pricing_system');
