CREATE TABLE `model_budgets` (
	`study_id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`limit_micros` integer NOT NULL,
	`call_micros` integer NOT NULL,
	`reserved_micros` integer NOT NULL,
	`calls` integer NOT NULL,
	FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON UPDATE no action ON DELETE cascade
);
