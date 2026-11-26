import uuid
import json
from typing import Optional, List, Dict, Any
import aiomysql
from app.core.database import db_pool

class NotificationRepository:
    @staticmethod
    async def create(user_id: str, notif_type: str, title: str, content: str, data: Optional[dict] = None) -> Dict[str, Any]:
        notification_id = str(uuid.uuid4())
        data_json = json.dumps(data, ensure_ascii=False) if data else None
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO notifications (notification_id, user_id, type, title, content, data, is_read)
                    VALUES (%s, %s, %s, %s, %s, %s, FALSE)
                    """,
                    (notification_id, user_id, notif_type, title, content, data_json),
                )
        return await NotificationRepository.get_by_id(notification_id)

    @staticmethod
    async def get_by_id(notification_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM notifications WHERE notification_id = %s", (notification_id,))
                row = await cur.fetchone()
                if row and isinstance(row.get("data"), str):
                    try:
                        row["data"] = json.loads(row["data"])
                    except Exception:
                        pass
                return row

    @staticmethod
    async def list_for_user(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
                    (user_id, limit),
                )
                rows = await cur.fetchall()
                for r in rows:
                    if r.get("data") and isinstance(r["data"], str):
                        try:
                            r["data"] = json.loads(r["data"])
                        except Exception:
                            pass
                return rows

    @staticmethod
    async def mark_as_read(notification_id: str, user_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE notifications SET is_read = TRUE WHERE notification_id = %s AND user_id = %s",
                    (notification_id, user_id),
                )

    @staticmethod
    async def mark_all_as_read(user_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
                    (user_id,),
                )

    @staticmethod
    async def delete(notification_id: str, user_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM notifications WHERE notification_id = %s AND user_id = %s",
                    (notification_id, user_id),
                )

    @staticmethod
    async def get_preferences(user_id: str) -> Dict[str, Any]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM notification_preferences WHERE user_id = %s", (user_id,))
                row = await cur.fetchone()
                if not row:
                    return {
                        "user_id": user_id,
                        "email_alerts_enabled": True,
                        "daily_reminder_enabled": True,
                        "daily_reminder_time": "20:00",
                    }
                return row

    @staticmethod
    async def update_preferences(user_id: str, payload: dict) -> Dict[str, Any]:
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO notification_preferences (user_id, email_alerts_enabled, daily_reminder_enabled, daily_reminder_time)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        email_alerts_enabled = VALUES(email_alerts_enabled),
                        daily_reminder_enabled = VALUES(daily_reminder_enabled),
                        daily_reminder_time = VALUES(daily_reminder_time)
                    """,
                    (
                        user_id,
                        payload.get("email_alerts_enabled", True),
                        payload.get("daily_reminder_enabled", True),
                        payload.get("daily_reminder_time", "20:00"),
                    ),
                )
        return await NotificationRepository.get_preferences(user_id)
