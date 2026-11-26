SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS category_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE category_db;

CREATE TABLE IF NOT EXISTS categories (
    category_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('INCOME', 'EXPENSE') NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'folder',
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    parent_id CHAR(36) NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_user (user_id),
    INDEX idx_category_parent (parent_id),
    INDEX idx_category_active (user_id, is_archived),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories (category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Danh mục Mặc định Hệ thống (System Default Categories - user_id = NULL)
-- Danh mục Thu (INCOME)
INSERT IGNORE INTO categories (category_id, user_id, name, type, icon, color, parent_id)
VALUES 
    ('10000000-0000-0000-0000-000000000001', NULL, 'Tiền lương', 'INCOME', 'briefcase', '#10B981', NULL),
    ('10000000-0000-0000-0000-000000000002', NULL, 'Tiền thưởng', 'INCOME', 'gift', '#059669', NULL),
    ('10000000-0000-0000-0000-000000000003', NULL, 'Đầu tư & Lãi suất', 'INCOME', 'trending-up', '#047857', NULL),
    ('10000000-0000-0000-0000-000000000004', NULL, 'Kinh doanh phụ', 'INCOME', 'shopping-bag', '#14B8A6', NULL),
    ('10000000-0000-0000-0000-000000000005', NULL, 'Thu nhập khác', 'INCOME', 'plus-circle', '#6B7280', NULL);

-- Danh mục Chi (EXPENSE) - Danh mục Cha
INSERT IGNORE INTO categories (category_id, user_id, name, type, icon, color, parent_id)
VALUES 
    ('20000000-0000-0000-0000-000000000001', NULL, 'Ăn uống', 'EXPENSE', 'utensils', '#EF4444', NULL),
    ('20000000-0000-0000-0000-000000000002', NULL, 'Di chuyển & Xăng xe', 'EXPENSE', 'car', '#F59E0B', NULL),
    ('20000000-0000-0000-0000-000000000003', NULL, 'Mua sắm cá nhân', 'EXPENSE', 'shopping-cart', '#EC4899', NULL),
    ('20000000-0000-0000-0000-000000000004', NULL, 'Nhà cửa & Hóa đơn', 'EXPENSE', 'home', '#3B82F6', NULL),
    ('20000000-0000-0000-0000-000000000005', NULL, 'Giải trí & Du lịch', 'EXPENSE', 'film', '#8B5CF6', NULL),
    ('20000000-0000-0000-0000-000000000006', NULL, 'Giáo dục & Học phí', 'EXPENSE', 'book-open', '#6366F1', NULL),
    ('20000000-0000-0000-0000-000000000007', NULL, 'Y tế & Sức khỏe', 'EXPENSE', 'heart', '#10B981', NULL),
    ('20000000-0000-0000-0000-000000000008', NULL, 'Chi tiêu khác', 'EXPENSE', 'more-horizontal', '#9CA3AF', NULL);

-- Danh mục Con (Subcategories)
INSERT IGNORE INTO categories (category_id, user_id, name, type, icon, color, parent_id)
VALUES 
    ('20000000-0000-0000-0001-000000000001', NULL, 'Cà phê & Trà sữa', 'EXPENSE', 'coffee', '#DC2626', '20000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0001-000000000002', NULL, 'Đi chợ / Siêu thị', 'EXPENSE', 'shopping-basket', '#B91C1C', '20000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0002-000000000001', NULL, 'Xăng xe', 'EXPENSE', 'fuel', '#D97706', '20000000-0000-0000-0000-000000000002'),
    ('20000000-0000-0000-0002-000000000002', NULL, 'Bảo dưỡng xe', 'EXPENSE', 'tool', '#B45309', '20000000-0000-0000-0000-000000000002'),
    ('20000000-0000-0000-0004-000000000001', NULL, 'Tiền điện & Nước', 'EXPENSE', 'zap', '#2563EB', '20000000-0000-0000-0000-000000000004'),
    ('20000000-0000-0000-0004-000000000002', NULL, 'Internet & Truyền hình', 'EXPENSE', 'wifi', '#1D4ED8', '20000000-0000-0000-0000-000000000004');
