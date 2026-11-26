# api-gateway (FINPULSE Central API Gateway)

Cổng điều phối và truy cập duy nhất của hệ thống Microservices:
- **Định tuyến yêu cầu**: Chuyển tiếp `/api/*` tới 7 microservices tương ứng.
- **Bảo mật & Xác thực tập trung**: Kiểm tra chữ ký JWT, giải mã danh tính người dùng và tự động truyền tải `X-User-Id`, `X-User-Role`, `X-User-Email` và `X-Internal-Service-Key` cho các dịch vụ phía sau.
- **WebSocket Reverse Proxy**: Chuyển tiếp kết nối thời gian thực hai chiều giữa trình duyệt Web App và `notification-service`.
- **CORS & Bảo vệ**: Xử lý Cross-Origin Resource Sharing tập trung.

## Danh Mục Định Tuyến

| Tiền Tố Đường Dẫn | Dịch Vụ Đích | Xác Thực Bắt Buộc |
| :--- | :--- | :--- |
| `/api/auth/register-request` | `auth-service` | Không (Công khai) |
| `/api/auth/login-request` | `auth-service` | Không (Công khai) |
| `/api/auth/verify-otp` | `auth-service` | Không (Công khai) |
| `/api/auth/*` | `auth-service` | Có (Bearer JWT) |
| `/api/finance/*` | `finance-core-service` | Có (Bearer JWT) |
| `/api/categories/*` | `category-service` | Có (Bearer JWT) |
| `/api/analytics/*` | `analytics-service` | Có (Bearer JWT) |
| `/api/attachments/*` | `attachment-service` | Có (Bearer JWT) |
| `/api/ocr/*` | `ocr-service` | Có (Bearer JWT) |
| `/api/notifications/*` | `notification-service` | Có (Bearer JWT) |
| `/ws` | `notification-service` | Có (`?token=JWT`) |
| `/health` | `api-gateway` | Không (Công khai) |
