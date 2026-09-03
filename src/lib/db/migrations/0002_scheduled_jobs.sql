CREATE TABLE IF NOT EXISTS `scheduled_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`test_case_ids` text NOT NULL,
	`interval_kind` text NOT NULL,
	`interval_value` integer NOT NULL,
	`time_of_day` text,
	`weekday` integer,
	`enabled` integer DEFAULT 1 NOT NULL,
	`next_run_at` integer NOT NULL,
	`last_run_at` integer,
	`last_run_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
