CREATE TABLE `mock_servers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`base_path` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mock_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` text NOT NULL,
	`method` text NOT NULL,
	`path_pattern` text NOT NULL,
	`status` integer DEFAULT 200 NOT NULL,
	`headers` text,
	`body` text,
	`delay_ms` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `mock_servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mock_responses_server` ON `mock_responses` (`server_id`, `method`, `sort_order`);
