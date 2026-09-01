CREATE TABLE `ai_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text,
	`tool_calls` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`active_provider` text,
	`model_by_provider` text,
	`encrypted_keys` text,
	`base_url_by_provider` text,
	`master_key_check` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `env_variables` (
	`id` text PRIMARY KEY NOT NULL,
	`env_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`is_secret` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`env_id`) REFERENCES `environments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `env_variables_env_id_key_unique` ON `env_variables` (`env_id`,`key`);--> statement-breakpoint
CREATE TABLE `environments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `environments_name_unique` ON `environments` (`name`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`name` text NOT NULL,
	`method` text NOT NULL,
	`url` text NOT NULL,
	`headers` text DEFAULT '[]' NOT NULL,
	`query_params` text DEFAULT '[]' NOT NULL,
	`body_kind` text DEFAULT 'none' NOT NULL,
	`body` text,
	`auth_kind` text DEFAULT 'none' NOT NULL,
	`auth_config` text,
	`pre_script` text,
	`post_script` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `test_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`assertions` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `test_run_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`request_id` text,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`response_meta` text,
	`error` text,
	`assertions_result` text,
	FOREIGN KEY (`run_id`) REFERENCES `test_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `test_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scope_ref` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`summary` text
);
