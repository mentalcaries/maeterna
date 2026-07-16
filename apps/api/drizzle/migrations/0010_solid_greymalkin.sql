UPDATE `access_grant`
SET `revoked_at` = unixepoch()
WHERE `revoked_at` is null
  AND EXISTS (
    SELECT 1
    FROM `access_grant` AS `earlier`
    WHERE `earlier`.`patient_id` = `access_grant`.`patient_id`
      AND `earlier`.`grant_type` = `access_grant`.`grant_type`
      AND `earlier`.`grantee_id` = `access_grant`.`grantee_id`
      AND `earlier`.`revoked_at` is null
      AND (
        `earlier`.`granted_at` < `access_grant`.`granted_at`
        OR (
          `earlier`.`granted_at` = `access_grant`.`granted_at`
          AND `earlier`.`id` < `access_grant`.`id`
        )
      )
  );
--> statement-breakpoint
CREATE UNIQUE INDEX `access_grant_active_unique_idx` ON `access_grant` (`patient_id`,`grant_type`,`grantee_id`) WHERE "access_grant"."revoked_at" is null;
