ALTER TABLE `user_permissions` MODIFY COLUMN `module` enum('crm','visits','closing','deals','kpi','planning','discounts','reports','tasks','collections','users') NOT NULL;
