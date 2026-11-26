CREATE DATABASE IF NOT EXISTS attachment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attachment_db;

CREATE TABLE IF NOT EXISTS attachments (
    attachment_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    transaction_id CHAR(36) NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'MINIO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attach_user (user_id),
    INDEX idx_attach_trans (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
