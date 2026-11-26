import io
import csv
import os
from typing import List, Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Unicode fonts for Vietnamese text in PDF
FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fonts")
ARIAL_PATH = os.path.join(FONT_DIR, "arial.ttf")
ARIALBD_PATH = os.path.join(FONT_DIR, "arialbd.ttf")

PDF_FONT = "Helvetica"
PDF_FONT_BOLD = "Helvetica-Bold"

try:
    if os.path.exists(ARIAL_PATH):
        pdfmetrics.registerFont(TTFont("Arial", ARIAL_PATH))
        PDF_FONT = "Arial"
    if os.path.exists(ARIALBD_PATH):
        pdfmetrics.registerFont(TTFont("Arial-Bold", ARIALBD_PATH))
        PDF_FONT_BOLD = "Arial-Bold"
except Exception as e:
    pass

class FinancialExporter:
    @staticmethod
    def export_csv(transactions: List[Dict[str, Any]], cat_map: Dict[str, Dict[str, Any]]) -> bytes:
        output = io.StringIO()
        # UTF-8 with BOM for proper Excel Vietnamese support
        writer = csv.writer(output)
        writer.writerow(["Mã Giao Dịch", "Ngày", "Loại", "Danh Mục", "Số Tiền (VND)", "Ghi Chú", "Trạng Thái"])
        
        for t in transactions:
            cat_name = cat_map.get(t.get("category_id"), {}).get("name", "Chưa phân loại")
            writer.writerow([
                t.get("transaction_id", ""),
                str(t.get("transaction_date", ""))[:19],
                "Thu" if t.get("type") == "INCOME" else "Chi",
                cat_name,
                f"{float(t.get('amount', 0)):,.0f}",
                t.get("note", ""),
                t.get("status", "COMPLETED"),
            ])
        
        return ("\ufeff" + output.getvalue()).encode("utf-8")

    @staticmethod
    def export_excel(transactions: List[Dict[str, Any]], cat_map: Dict[str, Dict[str, Any]]) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Bảng Kê Thu Chi"

        # Headers
        headers = ["Mã Giao Dịch", "Ngày Giao Dịch", "Loại", "Danh Mục", "Số Tiền (VND)", "Ghi Chú", "Trạng Thái"]
        ws.append(headers)

        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        alignment_center = Alignment(horizontal="center", vertical="center")

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = alignment_center

        # Rows
        for t in transactions:
            cat_name = cat_map.get(t.get("category_id"), {}).get("name", "Chưa phân loại")
            trans_type = "Khoản Thu" if t.get("type") == "INCOME" else "Khoản Chi"
            ws.append([
                t.get("transaction_id", ""),
                str(t.get("transaction_date", ""))[:19],
                trans_type,
                cat_name,
                float(t.get("amount", 0)),
                t.get("note", ""),
                t.get("status", "COMPLETED"),
            ])

        # Auto-fit column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

        stream = io.BytesIO()
        wb.save(stream)
        return stream.getvalue()

    @staticmethod
    def export_pdf(transactions: List[Dict[str, Any]], cat_map: Dict[str, Dict[str, Any]], summary: Dict[str, Any]) -> bytes:
        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        elements = []

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontName=PDF_FONT_BOLD,
            fontSize=16,
            leading=20,
            alignment=1, # Center
            textColor=colors.HexColor("#1E3A8A"),
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName=PDF_FONT,
            fontSize=9,
            leading=13,
            alignment=1,
            textColor=colors.HexColor("#6B7280"),
        )

        elements.append(Paragraph("FINPULSE - BÁO CÁO TÀI CHÍNH CÁ NHÂN", title_style))
        elements.append(Paragraph("Bảng kê giao dịch và tổng kết dòng tiền thu chi", subtitle_style))
        elements.append(Spacer(1, 15))

        # Summary Table
        summary_data = [
            ["Tổng Thu Nhập", "Tổng Chi Tiêu", "Dòng Tiền Ròng (Surplus)", "Tỷ Lệ Tiết Kiệm"],
            [
                f"{summary.get('total_income', 0):,.0f} VND",
                f"{summary.get('total_expense', 0):,.0f} VND",
                f"{summary.get('net_cashflow', 0):,.0f} VND",
                f"{summary.get('savings_rate', 0)}%",
            ],
        ]
        summary_table = Table(summary_data, colWidths=[130, 130, 150, 120])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ("FONTNAME", (0, 0), (-1, -1), PDF_FONT_BOLD),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Transactions List Table
        table_rows = [["Ngày", "Loại", "Danh Mục", "Số Tiền (VND)", "Ghi Chú"]]
        for t in transactions[:100]: # top 100 for PDF layout
            cat_name = cat_map.get(t.get("category_id"), {}).get("name", "Chưa phân loại")
            t_type = "Thu" if t.get("type") == "INCOME" else "Chi"
            table_rows.append([
                str(t.get("transaction_date", ""))[:10],
                t_type,
                cat_name[:25],
                f"{float(t.get('amount', 0)):,.0f}",
                (t.get("note") or "")[:30],
            ])

        tx_table = Table(table_rows, colWidths=[75, 45, 130, 110, 170])
        tx_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), PDF_FONT_BOLD),
            ("FONTNAME", (0, 1), (-1, -1), PDF_FONT),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("ALIGN", (3, 1), (3, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(tx_table)

        doc.build(elements)
        return stream.getvalue()
