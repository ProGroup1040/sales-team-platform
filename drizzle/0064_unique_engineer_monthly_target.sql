-- Keep one canonical row per engineer/month before enforcing the database invariant.
-- The newest row wins, matching the last manual or automatic write.
DELETE t1
FROM `engineer_targets` t1
INNER JOIN `engineer_targets` t2
  ON t1.`engineerId` = t2.`engineerId`
 AND t1.`year` = t2.`year`
 AND t1.`month` = t2.`month`
 AND t1.`id` < t2.`id`;
--> statement-breakpoint

ALTER TABLE `engineer_targets`
  ADD CONSTRAINT `engineer_targets_engineer_month_year_unique`
  UNIQUE (`engineerId`, `year`, `month`);
