CREATE TABLE `groupUsers` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36),
	`group_id` char(36),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groupUsers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectGroups` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(200) NOT NULL,
	`description` varchar(1000),
	`project_id` char(36),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectUsers` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36),
	`project_id` char(36),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectUsers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(200) NOT NULL,
	`description` varchar(1000),
	`documentation` varchar(200),
	`tester_id` char(36),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(200) NOT NULL,
	`description` varchar(1000),
	`user_id` char(36),
	`group_id` char(36),
	`project_id` char(36),
	`delivery_date` date,
	`status` enum('pending','inprogress','done','edit','approve') DEFAULT 'pending',
	`tester_note` varchar(1000),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(200) NOT NULL,
	`email` varchar(100) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`image` varchar(200),
	`password` varchar(255) NOT NULL,
	`status` enum('active','inactive') DEFAULT 'active',
	`role` enum('super_admin','admin','tester','engineer') NOT NULL DEFAULT 'engineer',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
ALTER TABLE `groupUsers` ADD CONSTRAINT `groupUsers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groupUsers` ADD CONSTRAINT `groupUsers_group_id_projectGroups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `projectGroups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectGroups` ADD CONSTRAINT `projectGroups_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectUsers` ADD CONSTRAINT `projectUsers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projectUsers` ADD CONSTRAINT `projectUsers_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_tester_id_users_id_fk` FOREIGN KEY (`tester_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_group_id_projectGroups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `projectGroups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;