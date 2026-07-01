PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_doctor_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`registration_number` text,
	`verified` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_doctor_profile`("id", "user_id", "registration_number", "verified", "updated_at") SELECT "id", "user_id", "registration_number", "verified", "updated_at" FROM `doctor_profile`;--> statement-breakpoint
DROP TABLE `doctor_profile`;--> statement-breakpoint
ALTER TABLE `__new_doctor_profile` RENAME TO `doctor_profile`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `doctor_profile_user_id_unique` ON `doctor_profile` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `doctor_profile_registration_number_unique` ON `doctor_profile` (`registration_number`);