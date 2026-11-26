from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from app.analytics.service import AnalyticsService
from app.analytics.exporter import FinancialExporter
from app.core.security import get_current_user_claims
from app.core.errors import success, AppError

router = APIRouter()

@router.get("/cashflow")
async def get_cashflow(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user_claims),
):
    summary = await AnalyticsService.get_cashflow_summary(claims["sub"], from_date, to_date)
    return success(data=summary)

@router.get("/breakdown")
async def get_breakdown(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user_claims),
):
    breakdown = await AnalyticsService.get_expense_breakdown(claims["sub"], from_date, to_date)
    return success(data=breakdown)

@router.get("/trends")
async def get_trends(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user_claims),
):
    trends = await AnalyticsService.get_trends(claims["sub"], from_date, to_date)
    return success(data=trends)

@router.get("/insights")
async def get_insights(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user_claims),
):
    insights = await AnalyticsService.get_insights(claims["sub"], from_date, to_date)
    return success(data=insights)

@router.get("/export")
async def export_report(
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user_claims),
):
    user_id = claims["sub"]
    transactions = await AnalyticsService.fetch_user_transactions(user_id, from_date, to_date)
    cat_map = await AnalyticsService.fetch_category_map()

    if format == "csv":
        content = FinancialExporter.export_csv(transactions, cat_map)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=finpulse_report.csv"},
        )
    elif format == "xlsx":
        content = FinancialExporter.export_excel(transactions, cat_map)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=finpulse_report.xlsx"},
        )
    elif format == "pdf":
        summary = await AnalyticsService.get_cashflow_summary(user_id, from_date, to_date)
        content = FinancialExporter.export_pdf(transactions, cat_map, summary)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=finpulse_report.pdf"},
        )
    
    raise AppError("INVALID_FORMAT", "Định dạng xuất file không được hỗ trợ", status_code=400)
