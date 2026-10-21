-- ============================================================
-- SQL Migration Script: Unified Sales Tables for Taskito DB
-- Database: wegostation_tasketo
-- Match Charset with users table: utf8 COLLATE utf8_general_ci
-- ============================================================

-- 1. Sales Projects Table
CREATE TABLE IF NOT EXISTS `sales_projects` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `logo` VARCHAR(500) NOT NULL,
  `design` VARCHAR(50) NOT NULL DEFAULT 'design 1',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 2. Sales Project Users Association Table
CREATE TABLE IF NOT EXISTS `sales_project_users` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_spu_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 3. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `feez` DOUBLE DEFAULT 0,
  `description` VARCHAR(1000) NULL,
  `demo_link` VARCHAR(200) NULL,
  `points` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 4. Visit Status Table
CREATE TABLE IF NOT EXISTS `visitStatus` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_visit_status_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 5. Targets Table
CREATE TABLE IF NOT EXISTS `targets` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `type` ENUM('visit', 'sales', 'points') DEFAULT 'visit',
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_targets_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 6. Target Items Table
CREATE TABLE IF NOT EXISTS `target_items` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `year` INT NOT NULL,
  `month` INT NOT NULL,
  `number` DOUBLE NOT NULL,
  `target_id` CHAR(36) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ti_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ti_target` FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 7. Target Sales Table
CREATE TABLE IF NOT EXISTS `target_sales` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `target_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ts_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ts_target` FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 8. Visits Table
CREATE TABLE IF NOT EXISTS `visits` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `lat` DOUBLE NOT NULL,
  `lng` DOUBLE NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `owner_name` VARCHAR(255) NULL,
  `owner_phone` VARCHAR(20) NULL,
  `address` VARCHAR(500) NOT NULL,
  `notes` VARCHAR(1000) NULL,
  `phone` VARCHAR(20) NOT NULL,
  `points` INT DEFAULT 0,
  `status` ENUM('visit', 'sales', 'delivered') DEFAULT 'visit',
  `status_id` CHAR(36) NULL,
  `sales_id` CHAR(36) NULL,
  `products` LONGTEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_visits_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visits_status` FOREIGN KEY (`status_id`) REFERENCES `visitStatus` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_visits_sales_user` FOREIGN KEY (`sales_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 9. Leads Table
CREATE TABLE IF NOT EXISTS `leads` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `sales_id` CHAR(36) NULL,
  `place_name` VARCHAR(255) NULL,
  `place_phone` VARCHAR(20) NULL,
  `lat` DOUBLE NOT NULL,
  `lng` DOUBLE NOT NULL,
  `address` VARCHAR(500) NOT NULL,
  `notes` VARCHAR(1000) NULL,
  `products` LONGTEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_leads_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leads_sales_user` FOREIGN KEY (`sales_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 10. WishList Table
CREATE TABLE IF NOT EXISTS `wishList` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(1000) NULL,
  `sales_id` CHAR(36) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wishlist_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_sales_user` FOREIGN KEY (`sales_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- 11. Status Requests Table
CREATE TABLE IF NOT EXISTS `status_requests` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `sales_project_id` CHAR(36) NOT NULL,
  `visit_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `from` ENUM('visit', 'sales', 'delivered') NOT NULL,
  `to` ENUM('visit', 'sales', 'delivered') NOT NULL,
  `status` ENUM('pending', 'approve', 'reject') DEFAULT 'pending' NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sr_project` FOREIGN KEY (`sales_project_id`) REFERENCES `sales_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sr_visit` FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
