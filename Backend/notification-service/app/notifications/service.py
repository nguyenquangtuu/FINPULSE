import logging
import httpx
from typing import Dict, Any
from app.notifications.repository import NotificationRepository
from app.core.websocket import ws_manager
from app.core.email import send_alert_email
from app.core.config import settings

logger = logging.getLogger("notification-service.service")

class NotificationService:
    @staticmethod
    async def process_budget_alert(payload: dict) -> dict:
        user_id = payload["user_id"]
        threshold = payload["threshold"]
        category_name = payload["category_name"]
        spent = payload["current_spent"]
        limit = payload["amount_limit"]
        pct = payload["percentage"]

        title = f"⚠️ Cảnh báo ngân sách: Đạt {threshold}% hạn mức"
        if threshold >= 100:
            title = f"🚨 VƯỢT NGÂN SÁCH ({pct}%): {category_name}"
        
        content = (
            f"Chi tiêu cho '{category_name}' hiện tại là {spent:,.0f} VND / "
            f"{limit:,.0f} VND ({pct}% hạn mức). Vui lòng cân nhắc điều chỉnh chi tiêu!"
        )

        # 1. Save in-app notification
        record = await NotificationRepository.create(
            user_id=user_id,
            notif_type="BUDGET_WARNING",
            title=title,
            content=content,
            data=payload,
        )

        # 2. Push real-time WebSocket
        ws_msg = {
            "event": "BUDGET_ALERT",
            "notification": record,
        }
        await ws_manager.send_to_user(user_id, ws_msg)

        # 3. Check preferences & Send Email via SMTP
        prefs = await NotificationRepository.get_preferences(user_id)
        if prefs.get("email_alerts_enabled", True):
            user_email = await NotificationService._get_user_email(user_id)
            if user_email:
                email_body = f"""Xin chào,

{title}

{content}

Chu kỳ ngân sách của bạn đang được giám sát chặt chẽ trên FINPULSE.
Đăng nhập ngay để xem chi tiết biểu đồ chi tiêu: http://localhost:3000

Trân trọng,
Hệ thống Cảnh báo Tài chính FINPULSE
"""
                await send_alert_email(user_email, title, email_body)

        return record

    @staticmethod
    async def process_daily_reminder(user_id: str, title: str, content: str) -> dict:
        record = await NotificationRepository.create(
            user_id=user_id,
            notif_type="REMINDER",
            title=title,
            content=content,
        )

        # Push WebSocket
        await ws_manager.send_to_user(user_id, {"event": "DAILY_REMINDER", "notification": record})

        # Send email if enabled
        prefs = await NotificationRepository.get_preferences(user_id)
        if prefs.get("email_alerts_enabled", True):
            user_email = await NotificationService._get_user_email(user_id)
            if user_email:
                await send_alert_email(user_email, title, f"{content}\n\nTruy cập FINPULSE để ghi sổ thu chi!")

        return record

    @staticmethod
    async def _get_user_email(user_id: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{settings.AUTH_SERVICE_URL}/api/auth/internal/users/{user_id}",
                    headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY},
                )
                if resp.status_code == 200:
                    return resp.json().get("data", {}).get("email", "")
        except Exception as e:
            logger.warning(f"Could not retrieve email for user {user_id}: {e}")
        return ""
