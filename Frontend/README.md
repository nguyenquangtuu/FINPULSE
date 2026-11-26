# FINPULSE Frontend (Web App)
> Nền tảng quản lý thu chi cá nhân & Lập ngân sách thông minh
> Chuẩn UI/UX Modern Fintech SaaS (Linear & Stripe style)

## 1. Khởi chạy cục bộ (Development)

```bash
cd Frontend
npm install
npm run dev
```

Truy cập: `http://localhost:3000`

## 2. Tính Năng & Phân Hệ Đã Hiện Thực
- **Passwordless Auth**: Đăng nhập/Đăng ký không mật khẩu qua Email OTP 6 số.
- **Dashboard**: Chỉ số tài chính, biểu đồ Thu vs Chi, Donut cơ cấu danh mục, tiến độ ngân sách.
- **Giao dịch (Transactions)**: Sổ giao dịch, bộ lọc ngày/danh mục/loại, tìm kiếm, xem ảnh hóa đơn.
- **Quét hóa đơn OCR tự động (Receipt Scanner)**: Kéo thả ảnh hóa đơn $\rightarrow$ AI bóc tách số tiền, ngày, nơi bán $\rightarrow$ gợi ý danh mục và lưu 1-click.
- **Ngân sách (Budgets)**: Thiết lập hạn mức tuần/tháng/năm, thanh tiến độ 3 dải màu semantic (Xanh $<80\%$, Cam $80-99\%$, Đỏ $\ge 100\%$).
- **Danh mục (Categories)**: Cây phân cấp Cha-Con, đổi icon/màu sắc, cơ chế Soft Delete an toàn.
- **Giao dịch định kỳ (Recurring)**: Danh sách khoản chi cố định, chạy quét thủ công.
- **Báo cáo & Phân tích (Analytics)**: Biểu đồ xu hướng, insights tài chính, xuất báo cáo PDF, Excel (.xlsx), CSV.
- **Thông báo thời gian thực (Notifications)**: Kênh WebSocket đẩy cảnh báo tức thì, hỗ trợ **Browser Native Push Notification** (`Notification.requestPermission()`), nút bắn thử nghiệm.
- **Cài đặt (Settings)**: Đổi tiền tệ VND/USD, chuyển đổi Theme Sáng/Tối/Hệ thống, quản lý phiên đăng nhập và đăng xuất từ xa.
