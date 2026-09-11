CREATE TABLE `run_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `calls_owner_created` ON `run_calls` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `studies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`brief` text NOT NULL,
	`report` text NOT NULL,
	`research` text,
	`candidate` text,
	`stage` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`lease` text,
	`busy_until` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `studies_owner_updated` ON `studies` (`owner`,`updated_at`);