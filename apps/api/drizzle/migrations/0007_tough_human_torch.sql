DROP TABLE `mbtt_registry`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_doctor_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`registration_number` text NOT NULL,
	`phone_number` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_doctor_profile`("id", "user_id", "registration_number", "phone_number", "updated_at") SELECT "id", "user_id", COALESCE("registration_number", ''), '', "updated_at" FROM `doctor_profile`;--> statement-breakpoint
DROP TABLE `doctor_profile`;--> statement-breakpoint
ALTER TABLE `__new_doctor_profile` RENAME TO `doctor_profile`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `doctor_profile_user_id_unique` ON `doctor_profile` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_doctor_affiliation` (
	`id` text PRIMARY KEY NOT NULL,
	`doctor_id` text NOT NULL,
	`institution_id` text,
	`department_id` text,
	`practice_name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`doctor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institution`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON UPDATE no action ON DELETE no action,
	CHECK (
		("institution_id" IS NOT NULL AND "practice_name" IS NULL) OR
		("institution_id" IS NULL AND "practice_name" IS NOT NULL AND "department_id" IS NULL)
	)
);
--> statement-breakpoint
INSERT INTO `__new_doctor_affiliation`("id", "doctor_id", "institution_id", "department_id", "practice_name", "created_at") SELECT "id", "doctor_id", "institution_id", "department_id", NULL, strftime('%s', 'now') FROM `doctor_affiliation`;--> statement-breakpoint
DROP TABLE `doctor_affiliation`;--> statement-breakpoint
ALTER TABLE `__new_doctor_affiliation` RENAME TO `doctor_affiliation`;--> statement-breakpoint
CREATE UNIQUE INDEX `doctor_affiliation_unique_idx` ON `doctor_affiliation` (`doctor_id`,`department_id`);