INSERT INTO `role_permissions` (`role`, `module`, `canView`, `canAdd`, `canEdit`, `canDelete`, `dataScope`) VALUES
  ('admin', 'pricing_system', 1, 1, 1, 1, 'all'),
  ('manager', 'pricing_system', 1, 0, 0, 0, 'all'),
  ('admin_sales', 'pricing_system', 1, 0, 0, 0, 'all'),
  ('sales_engineer', 'pricing_system', 1, 0, 0, 0, 'own'),
  ('sales_specialist', 'pricing_system', 1, 0, 0, 0, 'own');
