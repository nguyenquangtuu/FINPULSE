# category-service (FINPULSE Category Management Microservice)

Vi dịch vụ phân cấp và quản trị danh mục thu chi:
- Quản lý danh mục mặc định hệ thống chuẩn hóa (Admin) và danh mục cá nhân (User) (FR-10, FR-11).
- Hỗ trợ mô hình phân tầng Cha - Con (Parent - Child).
- Toàn vẹn dữ liệu: Áp dụng cơ chế lưu trữ ẩn Soft Delete (`is_archived = TRUE`) thay vì xóa cứng (BR-06).

## API Endpoints

- `GET /api/categories`: Danh sách danh mục (cấu trúc Tree hoặc Flat)
- `GET /api/categories/{id}`: Chi tiết danh mục
- `POST /api/categories`: Tạo danh mục mới
- `PUT /api/categories/{id}`: Cập nhật tên, icon, màu sắc, danh mục cha
- `DELETE /api/categories/{id}`: Lưu trữ ẩn danh mục (Soft Delete)
- `GET /api/categories/internal/{id}`: Endpoint nội bộ cho các vi dịch vụ khác tra cứu thông tin danh mục
- `GET /health`: Kiểm tra trạng thái hoạt động của service
