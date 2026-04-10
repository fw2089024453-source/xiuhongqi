-- 创建数据库
CREATE DATABASE IF NOT EXISTS xiu_hong_qi_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE xiu_hong_qi_db;

-- 1. 用户表 (Users)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '哈希加密密码',
    phone VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
    role ENUM('user', 'admin') DEFAULT 'user' COMMENT '角色：普通用户/管理员',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间'
) ENGINE=InnoDB COMMENT='用户信息表';

-- 2. 作品表 (Videos)
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL COMMENT '视频标题',
    description TEXT COMMENT '作品简介',
    video_url VARCHAR(255) NOT NULL COMMENT '视频文件存储地址',
    cover_url VARCHAR(255) NOT NULL COMMENT '封面图存储地址',
    author_id INT NOT NULL COMMENT '作者ID',
    votes_count INT DEFAULT 0 COMMENT '当前票数',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='视频作品征集表';

-- 3. 互动-投票记录表 (Votes)
-- 用于精准限制“每人每天限投5票”
CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '投票用户ID',
    video_id INT NOT NULL COMMENT '获票视频ID',
    voted_at DATE NOT NULL COMMENT '投票日期(用于频次校验)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '具体投票时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户投票记录表';

-- 4. 互动-评论表 (Comments)
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    video_id INT NOT NULL,
    content TEXT NOT NULL COMMENT '评论正文',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='作品评论表';

-- 5. 公告表 (Announcements)
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '公告标题',
    type ENUM('info', 'urgent', 'update') DEFAULT 'info' COMMENT '公告类型',
    content TEXT NOT NULL COMMENT '公告正文',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='赛事公告表';