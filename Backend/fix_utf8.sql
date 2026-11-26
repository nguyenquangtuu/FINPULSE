SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 1. Sửa toàn bộ tên danh mục tiếng Việt chuẩn trong category_db
USE category_db;

UPDATE categories SET name = 'Tiền lương' WHERE category_id = '10000000-0000-0000-0000-000000000001';
UPDATE categories SET name = 'Tiền thưởng' WHERE category_id = '10000000-0000-0000-0000-000000000002';
UPDATE categories SET name = 'Đầu tư & Lãi suất' WHERE category_id = '10000000-0000-0000-0000-000000000003';
UPDATE categories SET name = 'Kinh doanh phụ' WHERE category_id = '10000000-0000-0000-0000-000000000004';
UPDATE categories SET name = 'Thu nhập khác' WHERE category_id = '10000000-0000-0000-0000-000000000005';

UPDATE categories SET name = 'Ăn uống' WHERE category_id = '20000000-0000-0000-0000-000000000001';
UPDATE categories SET name = 'Di chuyển & Xăng xe' WHERE category_id = '20000000-0000-0000-0000-000000000002';
UPDATE categories SET name = 'Mua sắm cá nhân' WHERE category_id = '20000000-0000-0000-0000-000000000003';
UPDATE categories SET name = 'Nhà cửa & Hóa đơn' WHERE category_id = '20000000-0000-0000-0000-000000000004';
UPDATE categories SET name = 'Giải trí & Du lịch' WHERE category_id = '20000000-0000-0000-0000-000000000005';
UPDATE categories SET name = 'Giáo dục & Học phí' WHERE category_id = '20000000-0000-0000-0000-000000000006';
UPDATE categories SET name = 'Y tế & Sức khỏe' WHERE category_id = '20000000-0000-0000-0000-000000000007';
UPDATE categories SET name = 'Chi tiêu khác' WHERE category_id = '20000000-0000-0000-0000-000000000008';

UPDATE categories SET name = 'Cà phê & Trà sữa' WHERE category_id = '20000000-0000-0000-0001-000000000001';
UPDATE categories SET name = 'Đi chợ / Siêu thị' WHERE category_id = '20000000-0000-0000-0001-000000000002';
UPDATE categories SET name = 'Xăng xe' WHERE category_id = '20000000-0000-0000-0002-000000000001';
UPDATE categories SET name = 'Bảo dưỡng xe' WHERE category_id = '20000000-0000-0000-0002-000000000002';
UPDATE categories SET name = 'Tiền điện & Nước' WHERE category_id = '20000000-0000-0000-0004-000000000001';
UPDATE categories SET name = 'Internet & Truyền hình' WHERE category_id = '20000000-0000-0000-0004-000000000002';

-- 2. Sửa toàn bộ ghi chú giao dịch mẫu trong finance_db
USE finance_db;

UPDATE transactions SET note = 'Lương tháng 11/2026' WHERE transaction_id = '40000000-0000-0000-0000-000000000001';
UPDATE transactions SET note = 'Ăn uống và liên hoan gia đình' WHERE transaction_id = '40000000-0000-0000-0000-000000000002';
UPDATE transactions SET note = 'Đổ xăng xe máy và bảo dưỡng' WHERE transaction_id = '40000000-0000-0000-0000-000000000003';
UPDATE transactions SET note = 'Tiền điện & nước tháng 11' WHERE transaction_id = '40000000-0000-0000-0000-000000000004';
