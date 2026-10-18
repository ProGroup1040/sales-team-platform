-- Canonicalize legacy permissions before enforcing one row per user and module.
-- When records collide, preserve neither expanded CRUD grants nor expanded scope.
UPDATE `user_permissions` AS target
JOIN (
  SELECT * FROM (
    SELECT
      `userId`,
      `module`,
      MIN(`id`) AS `keepId`,
      IF(MIN(`canView` = 1) = 1, 1, 0) AS `canView`,
      IF(MIN(`canAdd` = 1) = 1, 1, 0) AS `canAdd`,
      IF(MIN(`canEdit` = 1) = 1, 1, 0) AS `canEdit`,
      IF(MIN(`canDelete` = 1) = 1, 1, 0) AS `canDelete`,
      IF(MIN(`dataScope` = 'all') = 1, 'all', 'own') AS `dataScope`
    FROM `user_permissions`
    GROUP BY `userId`, `module`
    HAVING COUNT(*) > 1
  ) AS duplicate_groups
) AS merged ON target.`id` = merged.`keepId`
SET
  target.`canView` = merged.`canView`,
  target.`canAdd` = merged.`canAdd`,
  target.`canEdit` = merged.`canEdit`,
  target.`canDelete` = merged.`canDelete`,
  target.`dataScope` = merged.`dataScope`;
--> statement-breakpoint
DELETE duplicate
FROM `user_permissions` AS duplicate
JOIN `user_permissions` AS canonical
  ON canonical.`userId` = duplicate.`userId`
  AND canonical.`module` = duplicate.`module`
  AND canonical.`id` < duplicate.`id`;
--> statement-breakpoint
UPDATE `user_permissions` AS closing
JOIN `user_permissions` AS deals
  ON deals.`userId` = closing.`userId`
  AND deals.`module` = 'deals'
SET
  closing.`canView` = IF(closing.`canView` = 1 AND deals.`canView` = 1, 1, 0),
  closing.`canAdd` = IF(closing.`canAdd` = 1 AND deals.`canAdd` = 1, 1, 0),
  closing.`canEdit` = IF(closing.`canEdit` = 1 AND deals.`canEdit` = 1, 1, 0),
  closing.`canDelete` = IF(closing.`canDelete` = 1 AND deals.`canDelete` = 1, 1, 0),
  closing.`dataScope` = IF(closing.`dataScope` = 'all' AND deals.`dataScope` = 'all', 'all', 'own')
WHERE closing.`module` = 'closing';
--> statement-breakpoint
DELETE deals
FROM `user_permissions` AS deals
JOIN `user_permissions` AS closing
  ON closing.`userId` = deals.`userId`
  AND closing.`module` = 'closing'
WHERE deals.`module` = 'deals';
--> statement-breakpoint
UPDATE `user_permissions`
SET `module` = 'closing'
WHERE `module` = 'deals';
--> statement-breakpoint
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_user_module_unique` UNIQUE(`userId`,`module`);
