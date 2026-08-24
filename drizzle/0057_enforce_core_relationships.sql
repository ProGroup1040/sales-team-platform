-- Enforce core relationships after existing data has been audited.
-- The migration intentionally uses RESTRICT for required historical parents and
-- SET NULL for optional references so soft-delete and audit history remain safe.
ALTER TABLE `daily_tasks`
  ADD CONSTRAINT `daily_tasks_engineer_fk` FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `leads`
  ADD CONSTRAINT `leads_engineer_fk` FOREIGN KEY (`assignedEngineerId`) REFERENCES `engineers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `visits`
  ADD CONSTRAINT `visits_lead_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `visits_engineer_fk` FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `deals`
  ADD CONSTRAINT `deals_visit_fk` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `deals_lead_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `deals_engineer_fk` FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `collections`
  ADD CONSTRAINT `collections_deal_fk` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `collections_engineer_fk` FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_collection_fk` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `payments_engineer_fk` FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `payment_promises`
  ADD CONSTRAINT `payment_promises_collection_fk` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_promises_engineer_fk` FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `commission_payments`
  ADD CONSTRAINT `commission_payments_collection_fk` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `commission_payments_engineer_fk` FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_deal_fk` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `projects_sales_engineer_fk` FOREIGN KEY (`salesEngineerId`) REFERENCES `engineers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `projects_survey_engineer_fk` FOREIGN KEY (`executionSurveyEngineerId`) REFERENCES `engineers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `projects_responsible_fk` FOREIGN KEY (`currentResponsibleId`) REFERENCES `engineers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `project_movements`
  ADD CONSTRAINT `project_movements_project_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
