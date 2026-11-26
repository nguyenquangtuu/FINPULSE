# auth-service (FINPULSE Authentication & Identity Microservice)

Vi dịch vụ quản lý danh tính và bảo mật:
- Đăng ký và đăng nhập không mật khẩu thông qua Email OTP 6 chữ số (BR-01, BR-02).
- Cấp phát và làm mới Access Token (1 giờ) / Refresh Token (7 ngày) ký chuẩn JWT (NFR-05).
- Quản lý phiên làm việc đa thiết bị và hỗ trợ đăng xuất từ xa (FR-06).
- Cấu hình tùy chọn tiền tệ cá nhân mặc định (`VND`, `USD`) (FR-05).

## API Endpoints

- `POST /api/auth/register-request`: Yêu cầu mã OTP kích hoạt tài khoản
- `POST /api/auth/login-request`: Yêu cầu mã OTP đăng nhập không mật khẩu
- `POST /api/auth/verify-otp`: Kiểm tra mã OTP và trả về JWT Access/Refresh tokens
- `POST /api/auth/refresh-token`: Cấp mới Access Token từ Refresh Token
- `GET /api/auth/me`: Thông tin hồ sơ người dùng
- `PUT /api/auth/me`: Cập nhật họ tên, avatar, tiền tệ hiển thị
- `GET /api/auth/sessions`: Danh sách các thiết bị/phiên đang hoạt động
- `POST /api/auth/sessions/{id}/revoke`: Thu hồi phiên và đăng xuất từ xa
- `GET /health`: Kiểm tra trạng thái hoạt động của service
