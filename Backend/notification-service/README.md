# notification-service (FINPULSE Real-time Notification Microservice)

Vi dịch vụ điều phối và đẩy thông báo thời gian thực:
- Quản lý kênh kết nối song công **WebSocket** (`/ws` và `/api/notifications/ws`) đẩy thông báo tức thì lên Notification Center của Web App (FR-28).
- Tiếp nhận REST API cảnh báo vượt hạn mức ngân sách từ `finance-core-service` khi chạm ngưỡng 80%, 90%, 100% (FR-27).
- Gửi Email cảnh báo và nhắc nhở ghi chép chi tiêu tự động qua máy chủ SMTP / Mailpit (FR-26).
- Hỗ trợ xem danh sách thông báo, đánh dấu đã đọc và tùy chỉnh cài đặt nhận thông báo.

## API Endpoints

- `GET /api/notifications`: Danh sách thông báo của người dùng
- `PUT /api/notifications/{id}/read`: Đánh dấu đã đọc thông báo
- `PUT /api/notifications/read-all`: Đánh dấu đã đọc tất cả
- `DELETE /api/notifications/{id}`: Xóa thông báo
- `GET /api/notifications/preferences`: Cài đặt nhận thông báo (email, giờ nhắc)
- `PUT /api/notifications/preferences`: Cập nhật cài đặt
- `WS /ws`: Kênh kết nối WebSocket thời gian thực (kèm `?token=JWT_ACCESS_TOKEN`)
- `POST /api/notifications/internal/budget-alert`: Endpoint nội bộ tiếp nhận cảnh báo ngân sách
- `POST /api/notifications/internal/remind-daily`: Endpoint nội bộ gửi nhắc nhở định kỳ
- `GET /health`: Kiểm tra trạng thái hoạt động của service
