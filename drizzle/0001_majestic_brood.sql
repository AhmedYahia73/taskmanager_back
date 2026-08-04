CREATE TABLE `settings` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user` varchar(200) NOT NULL,
	`leader` varchar(200) NOT NULL,
	`admin` varchar(200) NOT NULL,
	`task_approve_points` int,
	`task_edit_points` int,
	`task_delay_points` int,
	`online_days` json,
	`delay_premission_minutes` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holiday_requests` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36) NOT NULL,
	`date` date NOT NULL,
	`status` enum('pending','approve','reject') DEFAULT 'pending',
	CONSTRAINT `holiday_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `online_requests` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36) NOT NULL,
	`date` date NOT NULL,
	`status` enum('pending','approve','reject') DEFAULT 'pending',
	CONSTRAINT `online_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`type` enum('fixed','number') NOT NULL,
	`days` json NOT NULL,
	`work_num` int DEFAULT 0,
	`holidays_num` int DEFAULT 0,
	CONSTRAINT `holidays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36) NOT NULL,
	`from` datetime NOT NULL,
	`to` datetime,
	`onsite` boolean NOT NULL,
	`departureOnsite` boolean DEFAULT false,
	`is_request_online` boolean DEFAULT false,
	`hours` real DEFAULT 0,
	`delay` double DEFAULT 0,
	`over_time` double DEFAULT 0,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36) NOT NULL,
	`date` datetime NOT NULL,
	`hours` double NOT NULL,
	`reason` varchar(255),
	`status` enum('pending','approve','reject') NOT NULL DEFAULT 'pending',
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(200) NOT NULL,
	`locations` json,
	`status` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(200) NOT NULL,
	`zone_id` char(36),
	`from` datetime NOT NULL,
	`to` datetime NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salaries` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36),
	`salary` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bonuses` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`user_id` char(36) NOT NULL,
	`type` enum('days','amount') DEFAULT 'amount',
	`amount` double NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bonuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projectGroups` ADD `documentation` varchar(200);--> statement-breakpoint
ALTER TABLE `tasks` ADD `is_edit` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `documentation` varchar(200);--> statement-breakpoint
ALTER TABLE `tasks` ADD `inprogress_date` date;--> statement-breakpoint
ALTER TABLE `tasks` ADD `done_date` date;--> statement-breakpoint
ALTER TABLE `tasks` ADD `extra_points` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `points` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `importanc_status` enum('low','medium','high','urgent') DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE `users` ADD `points` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `yearly_holidays` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `zone_id` char(36);--> statement-breakpoint
ALTER TABLE `users` ADD `shift_id` char(36);--> statement-breakpoint
ALTER TABLE `holiday_requests` ADD CONSTRAINT `holiday_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `online_requests` ADD CONSTRAINT `online_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `salaries` ADD CONSTRAINT `salaries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bonuses` ADD CONSTRAINT `bonuses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_shift_id_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE cascade ON UPDATE no action;