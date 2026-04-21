-- ============================================================
-- reading_app database structure
-- Import this in phpMyAdmin: Database > Import > reading_app.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `reading_app`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `reading_app`;

-- ------------------------------------------------------------
-- Sanctum personal access tokens (required by Laravel Sanctum)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tokenable_type` VARCHAR(255) NOT NULL,
  `tokenable_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `abilities` TEXT,
  `last_used_at` TIMESTAMP NULL,
  `expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student','teacher','admin') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Reading materials
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reading_materials` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `text` LONGTEXT NOT NULL,
  `level` VARCHAR(50) NOT NULL,
  `default_tts_rate` DECIMAL(4,2) NOT NULL,
  `language` VARCHAR(10) NOT NULL DEFAULT 'en',
  `bundled` TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Progress records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `progress_records` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `material_id` CHAR(36) NOT NULL,
  `session_score` DECIMAL(5,2) NOT NULL,
  `accuracy_score` DECIMAL(5,2) NOT NULL,
  `fluency_score` DECIMAL(5,2) NOT NULL,
  `pace` VARCHAR(20) NOT NULL,
  `feedback_summary` TEXT,
  `recording_url` VARCHAR(2048),
  `completed_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`material_id`) REFERENCES `reading_materials`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seed bundled reading materials
-- ------------------------------------------------------------
INSERT INTO `reading_materials` (`id`, `title`, `text`, `level`, `default_tts_rate`, `language`, `bundled`) VALUES
(
  UUID(),
  'The Little Red Hen',
  'Once upon a time, there was a little red hen who lived on a farm. She found some wheat seeds and decided to plant them. She asked her friends for help, but no one wanted to help her. So she planted the seeds herself. When the wheat grew tall, she asked for help to cut it. Again, no one helped. She cut it herself. She ground the wheat into flour and baked a loaf of bread. When the bread was ready, everyone wanted to eat it. But the little red hen said she would eat it herself, because she had done all the work.',
  'beginner',
  0.75,
  'en',
  1
),
(
  UUID(),
  'The Water Cycle',
  'Water is constantly moving around the Earth in a process called the water cycle. The sun heats water in oceans, lakes, and rivers, causing it to evaporate and rise into the atmosphere as water vapor. As the vapor rises, it cools and condenses into tiny water droplets, forming clouds. When enough droplets collect, they fall back to Earth as precipitation — rain, snow, sleet, or hail. This water flows into rivers and streams, soaks into the ground, or collects in lakes and oceans, where the cycle begins again.',
  'intermediate',
  1.00,
  'en',
  1
),
(
  UUID(),
  'The Theory of Relativity',
  'Albert Einstein\'s theory of relativity, published in two parts in 1905 and 1915, fundamentally changed our understanding of space, time, and gravity. The special theory of relativity introduced the concept that the laws of physics are the same for all observers moving at constant velocities, and that the speed of light in a vacuum is constant regardless of the motion of the source or observer. One of its most famous consequences is the equivalence of mass and energy, expressed in the equation E equals mc squared. The general theory of relativity extended these ideas to include acceleration and gravity, describing gravity not as a force but as a curvature of spacetime caused by mass and energy.',
  'advanced',
  1.25,
  'en',
  1
);
