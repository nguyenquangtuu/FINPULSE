# cron-worker (FINPULSE Automated Task Worker)

Tiến trình tự động chạy ngầm (Actor #3: Automated Task Worker):
- Định kỳ quét lịch giao dịch lặp và gọi API nội bộ `POST /api/finance/internal/recurring/execute-due` để sinh các bản ghi giao dịch thu/chi khi đến hạn (tiền nhà, tiền internet, lương,...).
- Định kỳ kiểm tra và kích hoạt thông báo nhắc nhở ghi chép chi tiêu trong ngày qua `POST /api/notifications/internal/remind-daily`.
