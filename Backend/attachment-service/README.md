# attachment-service (FINPULSE Attachment & Object Storage Microservice)

Vi dịch vụ quản lý và lưu trữ hóa đơn chứng từ:
- Tiếp nhận và kiểm tra tính hợp lệ của tệp đính kèm: định dạng JPEG, PNG, PDF và dung lượng tối đa 10MB (BR-08).
- Tích hợp kho lưu trữ đối tượng tương thích Amazon S3 (MinIO Object Storage) (FR-22).
- Sinh **Presigned URL** có hiệu lực ngắn (15 phút) để tải và xem ảnh chứng từ an toàn tuyệt đối.

## API Endpoints

- `POST /api/attachments/upload`: Tải lên ảnh hóa đơn / PDF
- `GET /api/attachments/{id}/url`: Lấy Presigned URL truy cập tệp
- `DELETE /api/attachments/{id}`: Xóa tệp khỏi MinIO và cơ sở dữ liệu
- `GET /api/attachments/internal/{id}`: Endpoint nội bộ cho các service khác
- `GET /health`: Kiểm tra trạng thái hoạt động của service
