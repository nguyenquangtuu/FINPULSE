CREATE DATABASE IF NOT EXISTS notification_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE notification_db;

CREATE TABLE IF NOT EXISTS notifications (
    notification_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type ENUM('BUDGET_WARNING', 'REMINDER', 'SYSTEM') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSON NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user (user_id),
    INDEX idx_notif_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id CHAR(36) PRIMARY KEY,
    email_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    daily_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    daily_reminder_time VARCHAR(10) NOT NULL DEFAULT '20:00',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mẫu dữ liệu ban đầu
INSERT IGNORE INTO notifications (notification_id, user_id, type, title, content, is_read)
VALUES 
    ('50000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'SYSTEM', 'Chào mừng đến với FINPULSE', 'Nền tảng quản lý tài chính thông minh của bạn đã sẵn sàng sử dụng!', TRUE);
