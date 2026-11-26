# finance-core-service (FINPULSE Financial Core Microservice)

Vi dịch vụ tài chính cốt lõi hợp nhất:
- Quản lý giao dịch thu chi CRUD với kiểm tra số tiền hợp lệ (> 0, BR-04).
- Bộ lọc đa tiêu chí: thời gian, loại thu/chi, danh mục, từ khóa (FR-08).
- Thiết lập hạn mức ngân sách theo danh mục hoặc tổng thể (FR-13).
- **In-DB Budget Recalculation (ACID, BR-05)**: Tự động tính toán lại tỷ lệ chi tiêu % và hạn mức còn lại ngay trong cùng Database Transaction.
- **Real-time Alert Trigger (BR-07)**: Tự động nhận diện các mốc cảnh báo 80%, 90%, 100% để gọi REST API sang `notification-service`.
- Giao dịch định kỳ tự động (Recurring rules) hỗ trợ Automated Task Worker (FR-09).

## API Endpoints

- `POST /api/finance/transactions`: Tạo giao dịch thu/chi mới (+ cập nhật ngân sách)
- `GET /api/finance/transactions`: Danh sách giao dịch phân trang, bộ lọc
- `GET /api/finance/transactions/{id}`: Chi tiết giao dịch
- `DELETE /api/finance/transactions/{id}`: Xóa giao dịch
- `POST /api/finance/budgets`: Thiết lập hạn mức ngân sách
- `GET /api/finance/budgets`: Danh sách ngân sách kèm tỷ lệ % tiêu dùng thời gian thực
- `POST /api/finance/recurring`: Thiết lập lịch lặp tự động (ngày, tuần, tháng)
- `POST /api/finance/internal/recurring/execute-due`: Endpoint nội bộ cho cron worker sinh giao dịch đến hạn
- `GET /api/finance/internal/user-transactions`: Endpoint nội bộ cho analytics-service
- `GET /health`: Kiểm tra trạng thái hoạt động của service
