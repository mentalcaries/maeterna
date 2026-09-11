ALTER TABLE `reading` ADD `reading_date` text;--> statement-breakpoint
ALTER TABLE `reading` ADD `slot` text;--> statement-breakpoint
CREATE UNIQUE INDEX `reading_daily_slot_unique_idx` ON `reading` (`patient_id`,`logged_by_id`,`type`,`reading_date`,`slot`) WHERE "reading"."reading_date" is not null and "reading"."slot" is not null;