USE `xiuhongqi_digital`;

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('site_name', 'Xiuhongqi Digital Platform', 'string', 'Site name'),
('site_description', 'Digital platform for red-culture heritage content', 'string', 'Site description'),
('main_color_red', '#D32F2F', 'string', 'Primary red color'),
('main_color_gold', '#FFD700', 'string', 'Primary gold color'),
('main_color_paper', '#F5F5DC', 'string', 'Primary paper color'),
('default_language', 'zh-CN', 'string', 'Default language'),
('maintenance_mode', 'false', 'boolean', 'Maintenance mode')
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  config_type = VALUES(config_type),
  description = VALUES(description);

INSERT INTO forum_sections (name, description, sort_order) VALUES
('Red Culture Discussion', 'Topics about red culture and revolutionary history', 1),
('Public Welfare Exchange', 'Activity organization, participation, and sharing', 2),
('Skill Teaching Q&A', 'Questions and discussion during skill learning', 3),
('Platform Feedback', 'Suggestions about platform features and experience', 4)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  sort_order = VALUES(sort_order);
