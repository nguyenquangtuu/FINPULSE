import logging
import httpx
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger("analytics-service.service")

class AnalyticsService:
    @staticmethod
    async def fetch_user_transactions(user_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {"user_id": user_id}
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.FINANCE_SERVICE_URL}/api/finance/internal/user-transactions",
                params=params,
                headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY},
            )
            if resp.status_code != 200:
                raise AppError("FINANCE_SERVICE_ERROR", "Không thể lấy dữ liệu giao dịch từ finance-core-service", status_code=502)
            return resp.json().get("data", [])

    @staticmethod
    async def fetch_category_map() -> Dict[str, Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=4.0) as client:
            try:
                resp = await client.get(
                    f"{settings.CATEGORY_SERVICE_URL}/api/categories/internal/all/list",
                    headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY},
                )
                if resp.status_code == 200:
                    items = resp.json().get("data", [])
                    return {item["category_id"]: item for item in items}
            except Exception as e:
                logger.warning(f"Could not load categories map: {e}")
        return {}

    @staticmethod
    async def get_cashflow_summary(user_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> Dict[str, Any]:
        transactions = await AnalyticsService.fetch_user_transactions(user_id, from_date, to_date)
        total_income = 0.0
        total_expense = 0.0

        for t in transactions:
            amt = float(t["amount"])
            if t["type"] == "INCOME":
                total_income += amt
            elif t["type"] == "EXPENSE":
                total_expense += amt

        net_cashflow = total_income - total_expense
        savings_rate = round((net_cashflow / total_income * 100), 2) if total_income > 0 else 0.0

        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_cashflow": net_cashflow,
            "savings_rate": savings_rate,
            "transaction_count": len(transactions),
        }

    @staticmethod
    async def get_expense_breakdown(user_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[Dict[str, Any]]:
        transactions = await AnalyticsService.fetch_user_transactions(user_id, from_date, to_date)
        cat_map = await AnalyticsService.fetch_category_map()

        cat_totals = defaultdict(float)
        total_expense = 0.0

        for t in transactions:
            if t["type"] == "EXPENSE":
                amt = float(t["amount"])
                cat_totals[t["category_id"]] += amt
                total_expense += amt

        breakdown = []
        for cat_id, amount in cat_totals.items():
            cat_info = cat_map.get(cat_id, {})
            pct = round((amount / total_expense * 100), 2) if total_expense > 0 else 0.0
            breakdown.append({
                "category_id": cat_id,
                "category_name": cat_info.get("name", "Chưa phân loại"),
                "color": cat_info.get("color", "#6B7280"),
                "icon": cat_info.get("icon", "folder"),
                "total_amount": amount,
                "percentage": pct,
            })

        breakdown.sort(key=lambda x: x["total_amount"], reverse=True)
        return breakdown

    @staticmethod
    async def get_trends(user_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[Dict[str, Any]]:
        transactions = await AnalyticsService.fetch_user_transactions(user_id, from_date, to_date)
        trends_map = defaultdict(lambda: {"income": 0.0, "expense": 0.0})

        for t in transactions:
            # Group by date YYYY-MM-DD
            d_str = str(t["transaction_date"])[:10]
            amt = float(t["amount"])
            if t["type"] == "INCOME":
                trends_map[d_str]["income"] += amt
            elif t["type"] == "EXPENSE":
                trends_map[d_str]["expense"] += amt

        sorted_dates = sorted(trends_map.keys())
        return [
            {
                "date": d,
                "income": trends_map[d]["income"],
                "expense": trends_map[d]["expense"],
                "net": trends_map[d]["income"] - trends_map[d]["expense"],
            }
            for d in sorted_dates
        ]

    @staticmethod
    async def get_insights(user_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> Dict[str, Any]:
        transactions = await AnalyticsService.fetch_user_transactions(user_id, from_date, to_date)
        cat_map = await AnalyticsService.fetch_category_map()

        cat_totals = defaultdict(float)
        date_totals = defaultdict(float)

        for t in transactions:
            if t["type"] == "EXPENSE":
                amt = float(t["amount"])
                cat_totals[t["category_id"]] += amt
                d_str = str(t["transaction_date"])[:10]
                date_totals[d_str] += amt

        top_category = None
        if cat_totals:
            top_cat_id = max(cat_totals, key=cat_totals.get)
            top_category = {
                "category_id": top_cat_id,
                "category_name": cat_map.get(top_cat_id, {}).get("name", "Chưa phân loại"),
                "amount": cat_totals[top_cat_id],
            }

        peak_day = None
        if date_totals:
            top_date = max(date_totals, key=date_totals.get)
            peak_day = {
                "date": top_date,
                "amount": date_totals[top_date],
            }

        return {
            "top_category": top_category,
            "peak_day": peak_day,
            "total_expenses_count": sum(1 for t in transactions if t["type"] == "EXPENSE"),
        }
