# analytics-service (FINPULSE Analytics & Financial Reporting Microservice)

Vi dịch vụ phân tích dữ liệu tài chính và kết xuất báo cáo:
- Tổng hợp dòng tiền ròng: tổng thu, tổng chi, thặng dư/thâm hụt tài chính (FR-17).
- Cung cấp dữ liệu trực quan hóa biểu đồ tròn cơ cấu danh mục và biểu đồ cột/đường biến động theo thời gian (FR-18).
- Tìm kiếm hiểu biết tài chính (Insights): danh mục chi tiêu nhiều nhất, ngày chi tiêu cao đột biến trong kỳ (FR-19).
- **Kết xuất báo cáo tài chính đa định dạng (FR-20)**:
  - `CSV`: Tích hợp UTF-8 BOM, tương thích tuyệt đối với Microsoft Excel tiếng Việt.
  - `XLSX`: Định dạng bảng biểu chuyên nghiệp, màu sắc chuẩn.
  - `PDF`: Sử dụng ReportLab render bảng kê thu chi và tóm tắt dòng tiền.

## API Endpoints

- `GET /api/analytics/cashflow`: Dòng tiền ròng tổng quan
- `GET /api/analytics/breakdown`: Cơ cấu chi tiêu theo danh mục
- `GET /api/analytics/trends`: Biến động thu chi theo ngày/chu kỳ
- `GET /api/analytics/insights`: Thống kê điểm đột biến và thói quen chi tiêu
- `GET /api/analytics/export`: Xuất bảng kê ra tệp (`?format=csv|xlsx|pdf`)
- `GET /health`: Kiểm tra trạng thái hoạt động của service
