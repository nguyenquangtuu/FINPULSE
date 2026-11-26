# ocr-service (FINPULSE Optical Character Recognition Microservice)

Vi dịch vụ quét và bóc tách thông tin hóa đơn tự động:
- Tiếp nhận tệp hình ảnh hóa đơn chứng từ (JPEG, PNG) (FR-24).
- Phân tích và bóc tách dữ liệu có cấu trúc JSON:
  - `amount`: Số tiền thanh toán
  - `transactionDate`: Ngày giao dịch phát sinh
  - `vendor`: Tên đơn vị bán / nhà cung cấp
- Tự động đối chiếu từ khóa và gợi ý danh mục thu/chi tương ứng từ `category-service` (FR-25).

## API Endpoints

- `POST /api/ocr/scan`: Tải ảnh hóa đơn lên và nhận kết quả bóc tách JSON
- `GET /health`: Kiểm tra trạng thái hoạt động của service
