ALTER TABLE `app_users`
  MODIFY COLUMN `role` enum('sales_engineer','sales_specialist','admin_sales','manager','admin') NOT NULL DEFAULT 'sales_engineer';
