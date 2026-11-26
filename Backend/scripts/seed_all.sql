-- ==============================================================================
-- MASTER SEED SCRIPT CHO TOÀN BỘ HỆ THỐNG FINPULSE (5 CƠ SỞ DỮ LIỆU LOGIC)
-- ==============================================================================

-- 1. auth_db
USE auth_db;
INSERT IGNORE INTO users (user_id, full_name, email, status, role, currency)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin@finpulse.local', 'ACTIVE', 'ADMIN', 'VND'),
    ('22222222-2222-2222-2222-222222222222', 'Nguyễn Quang Tựu', 'demo@finpulse.local', 'ACTIVE', 'USER', 'VND');

-- 2. category_db
USE category_db;
-- Đã có sẵn 19 danh mục mặc định chuẩn hóa (Ăn uống, Di chuyển, Mua sắm, v.v.) trong 03-category.sql

-- 3. finance_db
USE finance_db;
-- Ngân sách tháng mẫu cho người dùng Demo
INSERT IGNORE INTO budgets (budget_id, user_id, category_id, amount_limit, period, start_date, end_date, alert_threshold_80, alert_threshold_90, alert_threshold_100)
VALUES 
    ('30000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '20000000-0000-0000-0000-000000000001', 3000000.00, 'MONTH', '2026-11-01', '2026-11-30', TRUE, FALSE, FALSE),
    ('30000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', NULL, 12000000.00, 'MONTH', '2026-11-01', '2026-11-30', FALSE, FALSE, FALSE);

-- Giao dịch mẫu
INSERT IGNORE INTO transactions (transaction_id, user_id, category_id, amount, type, transaction_date, note)
VALUES 
    ('40000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001', 15000000.00, 'INCOME', '2026-11-05 09:00:00', 'Lương tháng 11/2026'),
    ('40000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '20000000-0000-0000-0000-000000000001', 2450000.00, 'EXPENSE', '2026-11-12 19:30:00', 'Ăn tối và họp mặt bạn bè'),
    ('40000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '20000000-0000-0000-0000-000000000002', 450000.00, 'EXPENSE', '2026-11-15 10:15:00', 'Đổ xăng xe máy và bảo dưỡng'),
    ('40000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', '20000000-0000-0000-0004-000000000001', 650000.00, 'EXPENSE', '2026-11-18 14:00:00', 'Tiền điện & nước tháng 11');

-- Quy tắc giao dịch lặp mẫu (tiền phòng trọ cố định hàng tháng)
INSERT IGNORE INTO recurring_rules (recurring_id, user_id, category_id, amount, type, note, frequency, next_run_date, is_active)
VALUES 
    ('40000000-0000-0000-0000-000000000099', '22222222-2222-2222-2222-222222222222', '20000000-0000-0000-0000-000000000004', 3500000.00, 'EXPENSE', 'Tiền thuê phòng trọ', 'MONTHLY', '2026-12-01', TRUE);

-- 4. notification_db
USE notification_db;
INSERT IGNORE INTO notifications (notification_id, user_id, type, title, content, is_read)
VALUES 
    ('50000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'BUDGET_WARNING', '⚠️ Cảnh báo ngân sách: Đạt 81.7% hạn mức', 'Chi tiêu cho ''Ăn uống'' hiện tại là 2,450,000 VND / 3,000,000 VND (81.7% hạn mức). Vui lòng cân nhắc điều chỉnh chi tiêu!', FALSE);
