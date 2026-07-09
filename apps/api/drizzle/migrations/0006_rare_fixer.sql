DELETE FROM `threshold`;--> statement-breakpoint
DROP INDEX `threshold_patient_doctor_idx`;--> statement-breakpoint
ALTER TABLE `threshold` ADD `fasting_glucose_high` real NOT NULL;--> statement-breakpoint
ALTER TABLE `threshold` ADD `post_meal_glucose_high` real NOT NULL;--> statement-breakpoint
ALTER TABLE `threshold` ADD `systolic_high` real NOT NULL;--> statement-breakpoint
ALTER TABLE `threshold` ADD `diastolic_high` real NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `threshold_patient_id_unique` ON `threshold` (`patient_id`);--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `fasting_glucose_warning`;--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `fasting_glucose_critical`;--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `post_meal_glucose_warning`;--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `post_meal_glucose_critical`;--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `systolic_warning`;--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `systolic_critical`;--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `diastolic_warning`;--> statement-breakpoint
ALTER TABLE `threshold` DROP COLUMN `diastolic_critical`;--> statement-breakpoint
ALTER TABLE `reading` DROP COLUMN `severity`;