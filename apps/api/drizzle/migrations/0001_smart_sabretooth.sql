CREATE TABLE `mbtt_registry` (
	`member_id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`town_id` text,
	`status` text NOT NULL,
	`synced_at` text NOT NULL
);
