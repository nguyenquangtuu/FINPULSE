# FINPULSE - Nền Tảng Quản Lý Thu Chi Cá Nhân Thông Minh & Hỗ Trợ Lập Ngân Sách
> **Kiến trúc Hướng dịch vụ (SOA / Microservices Architecture)**  
> Đồ án môn học Kiến trúc Hướng dịch vụ (KTHDV) - Đại học Tôn Đức Thắng (TDTU)

---

## 1. Tổng Quan Kiến Trúc Hệ Thống

Hệ thống được thiết kế theo mô hình **Microservices Architecture / Database-per-Service**, bao gồm 7 vi dịch vụ độc lập, 1 API Gateway điều phối tập trung và 1 tiến trình Automated Task Worker:

| Dịch Vụ | Port | Cơ Sở Dữ Liệu | Chức Năng Chính |
| :--- | :--- | :--- | :--- |
| **`api-gateway`** | `8000` | *Stateless* | Cổng truy cập tập trung, xác thực JWT, CORS, WebSocket proxy |
| **`auth-service`** | `8001` | `auth_db` | Đăng ký & đăng nhập không mật khẩu qua Email OTP, cấp JWT, quản lý phiên |
| **`finance-core-service`** | `8002` | `finance_db` | Quản lý giao dịch thu chi, ngân sách, cảnh báo ngưỡng 80/90/100% & lặp định kỳ |
| **`category-service`** | `8003` | `category_db` | Danh mục chuẩn/cá nhân, cấu trúc phân cấp Cha - Con, cơ chế Soft Delete |
| **`analytics-service`** | `8004` | *Stateless* | Thống kê dòng tiền, phân tích biến động, xuất báo cáo PDF/XLSX/CSV |
| **`attachment-service`** | `8005` | `attachment_db` | Quản lý hóa đơn chứng từ, tích hợp MinIO S3 sinh Presigned URL an toàn |
| **`ocr-service`** | `8006` | *Stateless* | Quét & bóc tách hóa đơn JSON (số tiền, ngày, nơi bán), tự động gợi ý danh mục |
| **`notification-service`** | `8007` | `notification_db` | Đẩy thông báo thời gian thực WebSocket/SSE, Notification Center, Email SMTP |
| **`cron-worker`** | *Daemon* | *Stateless* | Tiến trình chạy ngầm quét sinh giao dịch định kỳ và nhắc nhở hàng ngày |

---

## 2. Dịch Vụ Hỗ Trợ Hạ Tầng (Infrastructure)

* **MySQL 8.0**: Cung cấp 5 cơ sở dữ liệu logic riêng biệt (`auth_db`, `finance_db`, `category_db`, `attachment_db`, `notification_db`) trên cổng `8552`.
* **MinIO Object Storage**: Lưu trữ tệp chứng từ hóa đơn tương thích S3 (API port `9000`, Console port `9001`).
* **Mailpit**: Máy chủ SMTP giả lập kiểm thử gửi mã OTP và email cảnh báo (SMTP port `1025`, Web UI port `8025`).

---

## 3. Khởi Chạy Nhanh (Quick Start)

```bash
cd Backend
docker compose up -d
```
