ALTER TABLE `studies` ADD `planner` text;--> statement-breakpoint
ALTER TABLE `studies` ADD `operations` text DEFAULT '{"metrics":[],"tasks":[],"outcomes":[]}' NOT NULL;--> statement-breakpoint
ALTER TABLE `studies` ADD `trace` text DEFAULT '[]' NOT NULL;