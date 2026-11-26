# FINPULSE - Hướng Dẫn Vận Hành & Tài Liệu Kỹ Thuật Backend

Hệ thống Backend được xây dựng hoàn chỉnh theo **Kiến trúc Hướng dịch vụ (SOA / Microservices Architecture)**, đáp ứng 100% các yêu cầu chức năng (FR-01 → FR-28), quy tắc nghiệp vụ (BR-01 → BR-09) và các kịch bản ca sử dụng (UC-01 → UC-11) trong tài liệu [Phân tích yêu cầu SOA CK.txt](../Phân%20tích%20yêu%20cầu%20SOA%20CK.txt).

---

## 1. Danh Mục Các Vi Dịch Vụ Độc Lập

Mỗi dịch vụ nằm ở một thư mục riêng biệt với đầy đủ mã nguồn, schema CSDL và Dockerfile:

| Thư Mục Dịch Vụ | Port | CSDL | Trách Nhiệm Cốt Lõi |
| :--- | :--- | :--- | :--- |
| **`api-gateway`** | `8000` | *Stateless* | Cổng API tập trung, xác thực Bearer JWT, phân phối WebSocket, kiểm soát CORS |
| **`auth-service`** | `8001` | `auth_db` | Xác thực không mật khẩu (Email OTP 6 số), cấp phát Access/Refresh JWT, quản lý phiên |
| **`finance-core-service`** | `8002` | `finance_db` | Quản lý giao dịch thu chi, quy tắc lặp, tự động tính ngân sách & cảnh báo ngưỡng 80/90/100% |
| **`category-service`** | `8003` | `category_db` | Danh mục mặc định chuẩn (Admin) và cá nhân (User), phân tầng Cha - Con, Soft Delete |
| **`analytics-service`** | `8004` | *Stateless* | Tổng hợp dòng tiền ròng, trực quan biểu đồ và xuất báo cáo tài chính PDF, XLSX, CSV |
| **`attachment-service`** | `8005` | `attachment_db` | Quản lý chứng từ đính kèm (JPEG, PNG, PDF <= 10MB), tích hợp MinIO S3 Presigned URL |
| **`ocr-service`** | `8006` | *Stateless* | Nhận diện chữ in trên hóa đơn, bóc tách JSON (số tiền, ngày, nơi bán) & gợi ý danh mục |
| **`notification-service`** | `8007` | `notification_db` | Đẩy thông báo thời gian thực WebSocket/SSE, Notification Center, gửi Email qua SMTP |
| **`cron-worker`** | *Daemon* | *Stateless* | Automated Task Worker chạy ngầm kích hoạt sinh giao dịch định kỳ & gửi nhắc nhở |

---

## 2. Dịch Vụ Hạ Tầng Đi Kèm (Infrastructure)

* **MySQL 8.0 Server** (Port `8552`): Cung cấp 5 cơ sở dữ liệu logic riêng biệt theo nguyên tắc Database-per-Service.
* **MinIO Object Storage** (Port `9000` / Console `9001`): Kho lưu trữ tệp hóa đơn tương thích AWS S3.
* **Mailpit SMTP Server & Web Mailbox** (SMTP `1025` / Web UI `8025`): Bắt email OTP và email cảnh báo thời gian thực để kiểm thử.

---

## 3. Khởi Chạy Toàn Bộ Hệ Thống Với Docker Compose

Chỉ cần một lệnh duy nhất tại thư mục `Backend/`:

```bash
cd Backend
docker compose up -d --build
```

Kiểm tra trạng thái các container đang chạy:
```bash
docker compose ps
```

---

## 4. Dữ Liệu Khởi Tạo & Tài Khoản Mẫu (Seed Accounts)

* **Tài khoản Quản trị viên (Admin)**: `admin@finpulse.local`
* **Tài khoản Người dùng mẫu (Demo User)**: `demo@finpulse.local`
* **Hộp thư kiểm thử (Mailpit UI)**: Truy cập trình duyệt tại `http://localhost:8025` để xem mã OTP 6 chữ số và email cảnh báo ngân sách.
* **Giao diện quản lý MinIO Console**: `http://localhost:9001` (Tài khoản: `minioadmin` / `miniopassword`).
