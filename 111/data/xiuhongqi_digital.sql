-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: xiuhongqi_digital
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_registrations`
--

DROP TABLE IF EXISTS `activity_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `activity_id` int NOT NULL,
  `user_id` int NOT NULL,
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','confirmed','attended','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_registration` (`activity_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_registration_date` (`registration_date`),
  CONSTRAINT `activity_registrations_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `public_welfare_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `activity_registrations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_registrations`
--

LOCK TABLES `activity_registrations` WRITE;
/*!40000 ALTER TABLE `activity_registrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('info','urgent','update') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` VALUES (1,'平台演示内容已补充','update','已补入首页公告、文化、公益、教学、互动和赛事样例内容，方便整站联调与展示。','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'后台内容管理正在完善','info','红旗文化、公益纪实、技艺教学三块内容已经具备后台录入基础。','2026-04-11 12:03:19','2026-04-11 12:03:19'),(3,'云端部署方案待收口','urgent','建议继续沿用 Express 托管前端产物，配合 Nginx 反代和上传目录持久化。','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_id` int NOT NULL,
  `user_id` int NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `likes_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_video` (`video_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_messages`
--

DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_way` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('cooperation','feedback','learning','other') COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('new','processing','resolved','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `contact_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_messages`
--

LOCK TABLES `contact_messages` WRITE;
/*!40000 ALTER TABLE `contact_messages` DISABLE KEYS */;
INSERT INTO `contact_messages` VALUES (1,NULL,'??????','13800138000','feedback','??????????????','new','2026-04-10 12:02:43','2026-04-10 12:02:43');
/*!40000 ALTER TABLE `contact_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_chapters`
--

DROP TABLE IF EXISTS `course_chapters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_chapters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `chapter_number` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_chapter` (`course_id`,`chapter_number`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `course_chapters_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `skill_teaching_courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_chapters`
--

LOCK TABLES `course_chapters` WRITE;
/*!40000 ALTER TABLE `course_chapters` DISABLE KEYS */;
INSERT INTO `course_chapters` VALUES (1,1,1,'准备材料与练习方式','确认布料、线样和拍照记录方式。',NULL,18,1,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,1,2,'基础针法拆解','围绕起针、收针和走线节奏做动作拆解。',NULL,26,2,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(3,1,3,'第一次完整练习','使用简化图案完成第一次练习。',NULL,22,3,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(4,2,1,'主题图案拆分','先把整体图案拆成中心元素和辅助底纹。',NULL,24,1,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(5,2,2,'构图与配色','确定视觉重心、留白节奏和主色层次。',NULL,28,2,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(6,2,3,'完成主题作品','输出适合投稿和学员展示的成品照片。',NULL,35,3,'2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `course_chapters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emb_comment_likes`
--

DROP TABLE IF EXISTS `emb_comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emb_comment_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_emb_comment_like` (`comment_id`,`user_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `emb_comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `emb_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emb_comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emb_comment_likes`
--

LOCK TABLES `emb_comment_likes` WRITE;
/*!40000 ALTER TABLE `emb_comment_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `emb_comment_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emb_comments`
--

DROP TABLE IF EXISTS `emb_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emb_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_id` int NOT NULL,
  `user_id` int NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `likes_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work` (`work_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `emb_comments_ibfk_1` FOREIGN KEY (`work_id`) REFERENCES `emb_works` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emb_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emb_comments`
--

LOCK TABLES `emb_comments` WRITE;
/*!40000 ALTER TABLE `emb_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `emb_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emb_votes_record`
--

DROP TABLE IF EXISTS `emb_votes_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emb_votes_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `work_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_emb_vote` (`user_id`,`work_id`),
  KEY `work_id` (`work_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `emb_votes_record_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emb_votes_record_ibfk_2` FOREIGN KEY (`work_id`) REFERENCES `emb_works` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emb_votes_record`
--

LOCK TABLES `emb_votes_record` WRITE;
/*!40000 ALTER TABLE `emb_votes_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `emb_votes_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emb_works`
--

DROP TABLE IF EXISTS `emb_works`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emb_works` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` json NOT NULL,
  `author_id` int DEFAULT NULL,
  `author_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `votes_count` int DEFAULT '0',
  `views_count` int DEFAULT '0',
  `status` enum('pending','approved','rejected','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `emb_works_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emb_works`
--

LOCK TABLES `emb_works` WRITE;
/*!40000 ALTER TABLE `emb_works` DISABLE KEYS */;
INSERT INTO `emb_works` VALUES (1,'红旗纹样练习作业','用基础针法完成的主题练习。','[\"/uploads/demo-embroidery-a.svg\"]',1,'codex_user_001','基础练习','13900000000',14,52,'approved','2026-04-11 12:03:20','2026-04-11 12:03:20','2026-04-11 12:03:20'),(2,'主题构图展示成品','完成度更高的一幅主题构图作品。','[\"/uploads/demo-embroidery-b.svg\", \"/uploads/demo-embroidery-a.svg\"]',2,'神','主题创作','13900000000',21,67,'approved','2026-04-11 12:03:20','2026-04-11 12:03:20','2026-04-11 12:03:20');
/*!40000 ALTER TABLE `emb_works` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_registrations`
--

DROP TABLE IF EXISTS `event_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_event` (`event_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `event_registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `interaction_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_registrations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_registrations`
--

LOCK TABLES `event_registrations` WRITE;
/*!40000 ALTER TABLE `event_registrations` DISABLE KEYS */;
INSERT INTO `event_registrations` VALUES (1,1,1,'codex_user_001','13800000000','希望带一位家属一起参加，用于报名链路测试。','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `event_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_comment_likes`
--

DROP TABLE IF EXISTS `forum_comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_comment_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_comment_like` (`comment_id`,`user_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `forum_comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_comment_likes`
--

LOCK TABLES `forum_comment_likes` WRITE;
/*!40000 ALTER TABLE `forum_comment_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_comment_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_comments`
--

DROP TABLE IF EXISTS `forum_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `author_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `likes_count` int DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post` (`post_id`),
  KEY `idx_author` (`author_id`),
  CONSTRAINT `forum_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comments_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_comments`
--

LOCK TABLES `forum_comments` WRITE;
/*!40000 ALTER TABLE `forum_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_posts`
--

DROP TABLE IF EXISTS `forum_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `topic_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` int NOT NULL,
  `parent_post_id` int DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comments_count` int DEFAULT '0',
  `likes_count` int DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_post_id` (`parent_post_id`),
  KEY `deleted_by` (`deleted_by`),
  KEY `idx_topic` (`topic_id`),
  KEY `idx_author` (`author_id`),
  CONSTRAINT `forum_posts_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_3` FOREIGN KEY (`parent_post_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_4` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_posts`
--

LOCK TABLES `forum_posts` WRITE;
/*!40000 ALTER TABLE `forum_posts` DISABLE KEYS */;
INSERT INTO `forum_posts` VALUES (1,1,NULL,'平台会提供基础材料，首次报名只需要填写联系人信息。',2,NULL,NULL,0,0,0,NULL,NULL,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,1,NULL,'明白了，那我准备带家里人一起报名。',1,NULL,NULL,0,0,0,NULL,NULL,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(3,2,NULL,'建议先完成零基础针法入门，再去做主题构图。',2,NULL,NULL,0,0,0,NULL,NULL,'2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `forum_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_sections`
--

DROP TABLE IF EXISTS `forum_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `topics_count` int DEFAULT '0',
  `posts_count` int DEFAULT '0',
  `last_post_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_sections`
--

LOCK TABLES `forum_sections` WRITE;
/*!40000 ALTER TABLE `forum_sections` DISABLE KEYS */;
INSERT INTO `forum_sections` VALUES (1,'作品交流','分享绣红旗作品、视频参赛作品和创作灵感。',NULL,1,1,1,'2026-04-11 12:03:19','active','2026-04-10 11:57:21','2026-04-11 12:03:20'),(2,'学习问答','围绕技艺教学、针法练习和课程内容提问交流。',NULL,2,1,2,'2026-04-11 12:03:19','active','2026-04-10 11:57:21','2026-04-11 12:03:20'),(3,'活动分享','记录公益活动、线下实践和平台联动见闻。',NULL,3,0,0,NULL,'active','2026-04-10 11:57:21','2026-04-11 12:03:19'),(4,'平台建议','收集平台体验反馈、功能建议和测试问题。',NULL,4,0,0,NULL,'active','2026-04-10 11:57:21','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `forum_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_topics`
--

DROP TABLE IF EXISTS `forum_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_topics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` int NOT NULL,
  `views_count` int DEFAULT '0',
  `replies_count` int DEFAULT '0',
  `last_reply_at` timestamp NULL DEFAULT NULL,
  `last_reply_by` int DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT '0',
  `is_locked` tinyint(1) DEFAULT '0',
  `status` enum('active','closed','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `last_reply_by` (`last_reply_by`),
  KEY `idx_section` (`section_id`),
  KEY `idx_pinned` (`is_pinned`),
  KEY `idx_last_reply` (`last_reply_at`),
  CONSTRAINT `forum_topics_ibfk_1` FOREIGN KEY (`section_id`) REFERENCES `forum_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_topics_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_topics_ibfk_3` FOREIGN KEY (`last_reply_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_topics`
--

LOCK TABLES `forum_topics` WRITE;
/*!40000 ALTER TABLE `forum_topics` DISABLE KEYS */;
INSERT INTO `forum_topics` VALUES (1,2,'第一次参加活动需要准备什么？','想确认是否需要自备布料、针线和报名信息。',1,24,2,NULL,NULL,0,0,'active','2026-04-11 12:03:19','2026-04-11 12:03:20'),(2,1,'这次课程更适合先练针法还是先做主题图？','想知道第一次练习应该从哪边入手更顺。',1,19,1,NULL,NULL,1,0,'active','2026-04-11 12:03:19','2026-04-11 12:03:20');
/*!40000 ALTER TABLE `forum_topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `interaction_events`
--

DROP TABLE IF EXISTS `interaction_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interaction_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `event_time` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_requirements` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','published','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'published',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interaction_events`
--

LOCK TABLES `interaction_events` WRITE;
/*!40000 ALTER TABLE `interaction_events` DISABLE KEYS */;
INSERT INTO `interaction_events` VALUES (1,'四月开放日体验报名','面向新用户的体验活动，包含参观、体验和简短教学展示。','2026-04-28 14:00','平台线下体验空间','/uploads/demo-event.svg','姓名、手机号、参与人数、是否需要现场材料','published','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'五月主题创作分享会','围绕主题创作课程展开分享，适合测试活动展示与报名联动。','2026-05-16 09:30','线上直播间','/uploads/demo-skill-course.svg','姓名、手机号、希望交流的问题','published','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `interaction_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `interaction_messages`
--

DROP TABLE IF EXISTS `interaction_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interaction_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `author_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `likes_count` int DEFAULT '0',
  `status` enum('visible','hidden') COLLATE utf8mb4_unicode_ci DEFAULT 'visible',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `interaction_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interaction_messages`
--

LOCK TABLES `interaction_messages` WRITE;
/*!40000 ALTER TABLE `interaction_messages` DISABLE KEYS */;
INSERT INTO `interaction_messages` VALUES (1,1,'codex_user_001','/uploads/demo-portrait-a.svg','今天首页内容终于不空了，测试起来直观很多。',NULL,5,'visible','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,2,'神','/uploads/demo-portrait-b.svg','课程、公益、文化三块现在都能拿来做演示了。','/uploads/demo-event.svg',8,'visible','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `interaction_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operation_logs`
--

DROP TABLE IF EXISTS `operation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `operation_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation_target` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operation_details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_operation_type` (`operation_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `operation_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operation_logs`
--

LOCK TABLES `operation_logs` WRITE;
/*!40000 ALTER TABLE `operation_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `operation_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `public_welfare_activities`
--

DROP TABLE IF EXISTS `public_welfare_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `public_welfare_activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `detailed_content` text COLLATE utf8mb4_unicode_ci,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organizer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_info` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participant_count` int DEFAULT '0',
  `target_participants` int DEFAULT NULL,
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gallery_images` json DEFAULT NULL,
  `status` enum('planning','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'planning',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`,`end_date`),
  CONSTRAINT `public_welfare_activities_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `public_welfare_activities`
--

LOCK TABLES `public_welfare_activities` WRITE;
/*!40000 ALTER TABLE `public_welfare_activities` DISABLE KEYS */;
INSERT INTO `public_welfare_activities` VALUES (1,'社区共绣行动','组织社区居民共同完成主题绣作，兼顾文化展示、公益参与和报名测试。','组织社区居民共同完成主题绣作，兼顾文化展示、公益参与和报名测试。','2026-04-15','2026-04-20','武汉市社区文化站','绣红旗平台运营组','027-00000000',18,30,'/uploads/demo-welfare.svg','[\"/uploads/demo-welfare.svg\", \"/uploads/demo-event.svg\"]','ongoing',2,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'非遗教室进校园','把基础针法、红旗主题创作和作品展示带进校园。','把基础针法、红旗主题创作和作品展示带进校园。','2026-05-08','2026-05-08','青年路中学','公益合作组','027-00000000',18,30,'/uploads/demo-event.svg','[\"/uploads/demo-event.svg\", \"/uploads/demo-event.svg\"]','planning',2,'2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `public_welfare_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `public_welfare_timelines`
--

DROP TABLE IF EXISTS `public_welfare_timelines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `public_welfare_timelines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int DEFAULT NULL,
  `event_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_urls` json DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_year` (`year`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `public_welfare_timelines`
--

LOCK TABLES `public_welfare_timelines` WRITE;
/*!40000 ALTER TABLE `public_welfare_timelines` DISABLE KEYS */;
INSERT INTO `public_welfare_timelines` VALUES (1,2024,'社区实践','第一场社区实践完成','完成首场线下实践后，平台沉淀了活动图片和参与者反馈。','[\"/uploads/demo-event.svg\", \"/uploads/demo-welfare.svg\"]',2024,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,2025,'校地联动','校地联动课程启动','把公益活动与技艺教学结合起来，形成更稳定的课程节奏。','[\"/uploads/demo-event.svg\", \"/uploads/demo-welfare.svg\"]',2025,'2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `public_welfare_timelines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `public_welfare_volunteers`
--

DROP TABLE IF EXISTS `public_welfare_volunteers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `public_welfare_volunteers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote` text COLLATE utf8mb4_unicode_ci,
  `introduction` text COLLATE utf8mb4_unicode_ci,
  `stat_years` int DEFAULT '0',
  `stat_projects` int DEFAULT '0',
  `stat_people` int DEFAULT '0',
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `public_welfare_volunteers`
--

LOCK TABLES `public_welfare_volunteers` WRITE;
/*!40000 ALTER TABLE `public_welfare_volunteers` DISABLE KEYS */;
INSERT INTO `public_welfare_volunteers` VALUES (1,'周敏','社区志愿讲师','把会做的事教给更多人，就是最直接的公益。','长期参与社区绣作教学与活动组织。',6,12,320,'/uploads/demo-portrait-a.svg',1,'2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'陈凯','活动执行志愿者','把大家聚在一起做一件有意义的事，平台才会真正热起来。','负责活动签到、流程安排和现场记录。',4,9,210,'/uploads/demo-portrait-b.svg',2,'2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `public_welfare_volunteers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `red_culture_history`
--

DROP TABLE IF EXISTS `red_culture_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `red_culture_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int DEFAULT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `importance` enum('楂','涓','浣') COLLATE utf8mb4_unicode_ci DEFAULT '涓',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `views_count` int DEFAULT '0',
  `likes_count` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_year` (`year`),
  KEY `idx_importance` (`importance`),
  KEY `idx_status` (`status`),
  KEY `idx_published_at` (`published_at`),
  CONSTRAINT `red_culture_history_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `red_culture_history`
--

LOCK TABLES `red_culture_history` WRITE;
/*!40000 ALTER TABLE `red_culture_history` DISABLE KEYS */;
INSERT INTO `red_culture_history` VALUES (1,'红旗主题展陈启动','以图文和实物并行的方式整理平台可展示的历史节点。',2019,'红旗文化馆','楂','/uploads/demo-red-culture.svg',0,0,2,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'社区讲述计划上线','围绕社区故事征集、口述整理和线上展示，形成可持续更新的内容池。',2022,'社区活动中心','涓','/uploads/demo-event.svg',0,0,2,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `red_culture_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `red_culture_spirit`
--

DROP TABLE IF EXISTS `red_culture_spirit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `red_culture_spirit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `importance` enum('楂','涓','浣') COLLATE utf8mb4_unicode_ci DEFAULT '涓',
  `icon_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_history_ids` json DEFAULT NULL,
  `views_count` int DEFAULT '0',
  `likes_count` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_importance` (`importance`),
  KEY `idx_status` (`status`),
  CONSTRAINT `red_culture_spirit_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `red_culture_spirit`
--

LOCK TABLES `red_culture_spirit` WRITE;
/*!40000 ALTER TABLE `red_culture_spirit` DISABLE KEYS */;
INSERT INTO `red_culture_spirit` VALUES (1,'守正创新','在传承既有文化精神的基础上，用更适合今天传播和教学的方式去表达。','楂','/uploads/demo-portrait-a.svg',NULL,0,0,2,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'共同参与','让文化内容、公益实践和用户互动形成循环，平台才会真正有生命力。','涓','/uploads/demo-portrait-b.svg',NULL,0,0,2,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `red_culture_spirit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `red_culture_stories`
--

DROP TABLE IF EXISTS `red_culture_stories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `red_culture_stories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year` int DEFAULT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `views_count` int DEFAULT '0',
  `likes_count` int DEFAULT '0',
  `comments_count` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `status` enum('draft','published','archived','pending_review') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_year` (`year`),
  KEY `idx_status` (`status`),
  KEY `idx_published_at` (`published_at`),
  CONSTRAINT `red_culture_stories_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `red_culture_stories`
--

LOCK TABLES `red_culture_stories` WRITE;
/*!40000 ALTER TABLE `red_culture_stories` DISABLE KEYS */;
INSERT INTO `red_culture_stories` VALUES (1,'一面红旗的诞生与传承','围绕红旗意象的形成、传播和延续，整理成适合前台展示的图文故事。','平台编辑部',1964,'湖北','/uploads/demo-red-culture.svg',0,0,0,2,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'针线之间的家国记忆','通过民间绣制技艺与红色叙事的结合，串联非遗传承和时代精神。','非遗讲述人',1978,'武汉','/uploads/demo-red-culture.svg',0,0,0,2,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `red_culture_stories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skill_teaching_categories`
--

DROP TABLE IF EXISTS `skill_teaching_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_teaching_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `sort_order` int DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_name` (`name`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skill_teaching_categories`
--

LOCK TABLES `skill_teaching_categories` WRITE;
/*!40000 ALTER TABLE `skill_teaching_categories` DISABLE KEYS */;
INSERT INTO `skill_teaching_categories` VALUES (1,'基础针法','适合零基础用户入门的课程和练习内容。',1,'active','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'主题创作','围绕红旗主题进行构图和完整作品创作。',2,'active','2026-04-11 12:03:19','2026-04-11 12:03:19'),(3,'素材与赏析','收纳图案素材、临摹参考和优秀作品拆解。',3,'active','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `skill_teaching_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skill_teaching_courses`
--

DROP TABLE IF EXISTS `skill_teaching_courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_teaching_courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `detailed_content` text COLLATE utf8mb4_unicode_ci,
  `difficulty` enum('鍒濈骇','涓?骇','楂樼骇') COLLATE utf8mb4_unicode_ci DEFAULT '鍒濈骇',
  `estimated_hours` int DEFAULT NULL,
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `video_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materials_list` json DEFAULT NULL,
  `instructor_id` int DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT '0',
  `views_count` int DEFAULT '0',
  `enrollments_count` int DEFAULT '0',
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `instructor_id` (`instructor_id`),
  KEY `idx_difficulty` (`difficulty`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category_id`),
  KEY `idx_featured` (`is_featured`),
  CONSTRAINT `fk_skill_teaching_courses_category` FOREIGN KEY (`category_id`) REFERENCES `skill_teaching_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `skill_teaching_courses_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skill_teaching_courses`
--

LOCK TABLES `skill_teaching_courses` WRITE;
/*!40000 ALTER TABLE `skill_teaching_courses` DISABLE KEYS */;
INSERT INTO `skill_teaching_courses` VALUES (1,1,'零基础针法入门','从起针、收针和走线方式开始，适合新用户快速进入可练习状态。','课程包含准备材料、基础示范和一份可直接练习的作业。','鍒濈骇',6,'/uploads/demo-skill-course.svg','https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','[\"练习布一块\", \"基础配色线样\", \"手机拍摄记录说明\"]',2,1,0,0,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,2,'红旗主题组合创作','围绕红旗图案与底纹组合展开，适合做完整作品创作。','课程重点在构图、配色和主题表达，可用于后续投稿准备。','涓?骇',10,'/uploads/demo-red-culture.svg','https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','[\"构图草图模板\", \"配色参考卡\", \"主题创作练习表\"]',2,0,0,0,'published','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `skill_teaching_courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skill_teaching_resources`
--

DROP TABLE IF EXISTS `skill_teaching_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_teaching_resources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skill_teaching_resources`
--

LOCK TABLES `skill_teaching_resources` WRITE;
/*!40000 ALTER TABLE `skill_teaching_resources` DISABLE KEYS */;
INSERT INTO `skill_teaching_resources` VALUES (1,'基础练习图样包','配合零基础课程使用的练习图样和节奏说明。','/uploads/demo-resource-pattern.txt','txt',1,'active','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,'主题创作步骤单','适合课堂演示和学员自测的主题创作流程清单。','/uploads/demo-resource-guide.txt','txt',2,'active','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `skill_teaching_resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skill_teaching_works`
--

DROP TABLE IF EXISTS `skill_teaching_works`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_teaching_works` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `author_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `likes_count` int DEFAULT '0',
  `status` enum('pending','approved','rejected','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `skill_teaching_works_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skill_teaching_works`
--

LOCK TABLES `skill_teaching_works` WRITE;
/*!40000 ALTER TABLE `skill_teaching_works` DISABLE KEYS */;
INSERT INTO `skill_teaching_works` VALUES (1,1,'codex_user_001','初学者红旗纹样练习','围绕基础针法做的小幅度练习。','/uploads/demo-embroidery-a.svg',6,'approved','2026-04-11 12:03:19','2026-04-11 12:03:19'),(2,2,'神','主题构图进阶作品','配合主题创作课程展示的样例作品。','/uploads/demo-embroidery-b.svg',10,'approved','2026-04-11 12:03:19','2026-04-11 12:03:19');
/*!40000 ALTER TABLE `skill_teaching_works` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_config`
--

DROP TABLE IF EXISTS `system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` text COLLATE utf8mb4_unicode_ci,
  `config_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_config`
--

LOCK TABLES `system_config` WRITE;
/*!40000 ALTER TABLE `system_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `role` enum('user','admin','moderator') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `status` enum('active','inactive','banned') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'codex_user_001','13800138001@xhq.local','$2b$10$Xk9Lu0M24SUg0cLdMPtWiuUf5kzNqJxaPQ1yl7WQQkJ0D7demt08u','13800138001','codex_user_001',NULL,NULL,'user','active','2026-04-11 11:42:52','2026-04-10 10:21:49','2026-04-11 11:42:52'),(2,'xhq_admin','admin@xhq.local','$2b$10$NCE2RRh816jyNNzSnyfnpObi3eAGEecaZWJZDJTP.51qt9lea85ai','13900000001','神',NULL,'','admin','active','2026-04-11 11:43:18','2026-04-10 14:36:19','2026-04-11 11:43:18');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `video_comment_likes`
--

DROP TABLE IF EXISTS `video_comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_comment_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_video_comment_like` (`comment_id`,`user_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `video_comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_comment_likes`
--

LOCK TABLES `video_comment_likes` WRITE;
/*!40000 ALTER TABLE `video_comment_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `video_comment_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `videos`
--

DROP TABLE IF EXISTS `videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `video_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cover_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author_id` int DEFAULT NULL,
  `contributor_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `votes_count` int DEFAULT '0',
  `views_count` int DEFAULT '0',
  `status` enum('pending','approved','rejected','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `videos`
--

LOCK TABLES `videos` WRITE;
/*!40000 ALTER TABLE `videos` DISABLE KEYS */;
INSERT INTO `videos` VALUES (1,'??????????','??????????????????????','/uploads/videos/1775823703140-xhq-video-test.mp4','/uploads/covers/1775823703140-xhq-video-cover-test.jpg',1,'codex_user_001','????','13800138001',0,0,'pending',NULL,'2026-04-10 12:21:43','2026-04-10 12:21:43'),(2,'绣作过程记录短片','记录从打样到完成作品的短视频，用于视频大赛页演示。','https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','/uploads/demo-video-cover.svg',1,'codex_user_001','创作记录','13800000000',12,47,'approved','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:06:13'),(3,'公益活动花絮剪影','用于展示公益活动现场节奏和用户参与氛围的短视频样例。','https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','/uploads/demo-event.svg',2,'神','活动纪实','13800000000',8,29,'approved','2026-04-11 12:03:20','2026-04-11 12:03:19','2026-04-11 12:06:21');
/*!40000 ALTER TABLE `videos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `votes_record`
--

DROP TABLE IF EXISTS `votes_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `votes_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `video_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_video_vote` (`user_id`,`video_id`),
  KEY `video_id` (`video_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `votes_record_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `votes_record_ibfk_2` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `votes_record`
--

LOCK TABLES `votes_record` WRITE;
/*!40000 ALTER TABLE `votes_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `votes_record` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-11 20:08:27
