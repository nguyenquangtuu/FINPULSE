import logging
import datetime
import calendar
import httpx
from typing import Optional, Dict, Any, List
from app.finance.repository import FinanceRepository
from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger("finance-core-service.service")

class FinanceService:
    @staticmethod
    async def create_transaction(user_id: str, payload: dict) -> dict:
        transaction, alerts = await FinanceRepository.create_transaction_atomic(user_id, payload)
        
        # Fire-and-forget or async notification push (NFR-03: Notification error must not block transaction)
        for alert in alerts:
            try:
                await FinanceService._dispatch_budget_alert(alert)
            except Exception as e:
                logger.warning(f"Failed to dispatch budget alert to notification-service: {e}")

        return transaction

    @staticmethod
    async def _dispatch_budget_alert(alert: dict):
        # Fetch category name from category-service if category_id exists
        category_name = "Tổng chi tiêu"
        if alert.get("category_id"):
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(
                        f"{settings.CATEGORY_SERVICE_URL}/api/categories/internal/{alert['category_id']}",
                        headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY},
                    )
                    if resp.status_code == 200:
                        cat_data = resp.json().get("data", {})
                        category_name = cat_data.get("name", "Danh mục")
            except Exception:
                pass

        payload = {
            "user_id": alert["user_id"],
            "budget_id": alert["budget_id"],
            "category_name": category_name,
            "threshold": alert["threshold"],
            "current_spent": alert["current_spent"],
            "amount_limit": alert["amount_limit"],
            "percentage": alert["percentage"],
        }

        async with httpx.AsyncClient(timeout=4.0) as client:
            await client.post(
                f"{settings.NOTIFICATION_SERVICE_URL}/api/notifications/internal/budget-alert",
                json=payload,
                headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY},
            )

    @staticmethod
    async def execute_due_recurring() -> dict:
        due_rules = await FinanceRepository.list_due_recurring_rules()
        executed_count = 0

        today = datetime.date.today()

        for rule in due_rules:
            # 1. Create transaction
            trans_payload = {
                "category_id": rule["category_id"],
                "amount": rule["amount"],
                "type": rule["type"],
                "transaction_date": datetime.datetime.now(),
                "note": f"[Tự động] {rule.get('note', '')}".strip(),
                "is_recurring": True,
                "recurring_id": rule["recurring_id"],
            }
            await FinanceService.create_transaction(rule["user_id"], trans_payload)
            executed_count += 1

            # 2. Advance next_run_date
            freq = rule["frequency"]
            cur_next = rule["next_run_date"]
            if freq == "DAILY":
                new_next = cur_next + datetime.timedelta(days=1)
            elif freq == "WEEKLY":
                new_next = cur_next + datetime.timedelta(weeks=1)
            elif freq == "MONTHLY":
                # Advance 1 month
                month = cur_next.month % 12 + 1
                year = cur_next.year + (cur_next.month // 12)
                max_days = calendar.monthrange(year, month)[1]
                day = min(cur_next.day, max_days)
                new_next = datetime.date(year, month, day)
            else:
                new_next = cur_next + datetime.timedelta(days=1)

            await FinanceRepository.update_recurring_next_run(rule["recurring_id"], new_next)

        return {"executed_count": executed_count, "date": str(today)}
