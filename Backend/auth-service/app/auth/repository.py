import uuid
import datetime
from typing import Optional, Dict, Any, List
import aiomysql
from app.core.database import db_pool

class AuthRepository:
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                return await cur.fetchone()

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
                return await cur.fetchone()

    @staticmethod
    async def list_active_users() -> List[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT user_id, email, full_name, role FROM users WHERE status = 'ACTIVE'")
                return await cur.fetchall()

    @staticmethod
    async def create_user(full_name: str, email: str, role: str = "USER") -> Dict[str, Any]:
        user_id = str(uuid.uuid4())
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    """
                    INSERT INTO users (user_id, full_name, email, status, role, currency)
                    VALUES (%s, %s, %s, 'ACTIVE', %s, 'VND')
                    """,
                    (user_id, full_name, email, role),
                )
                return await AuthRepository.get_user_by_id(user_id)

    @staticmethod
    async def update_user(user_id: str, full_name: Optional[str], currency: Optional[str], avatar_url: Optional[str]) -> Optional[Dict[str, Any]]:
        updates = []
        params = []
        if full_name is not None:
            updates.append("full_name = %s")
            params.append(full_name)
        if currency is not None:
            updates.append("currency = %s")
            params.append(currency)
        if avatar_url is not None:
            updates.append("avatar_url = %s")
            params.append(avatar_url)
        if not updates:
            return await AuthRepository.get_user_by_id(user_id)
        
        params.append(user_id)
        sql = f"UPDATE users SET {', '.join(updates)} WHERE user_id = %s"
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, tuple(params))
        return await AuthRepository.get_user_by_id(user_id)

    @staticmethod
    async def save_otp(email: str, otp_code: str, otp_type: str, full_name: Optional[str] = None) -> str:
        otp_id = str(uuid.uuid4())
        expires_at = datetime.datetime.now() + datetime.timedelta(minutes=5)
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO email_otps (otp_id, email, otp_code, otp_type, full_name, attempts, is_used, expires_at)
                    VALUES (%s, %s, %s, %s, %s, 0, FALSE, %s)
                    """,
                    (otp_id, email, otp_code, otp_type, full_name, expires_at),
                )
        return otp_id

    @staticmethod
    async def get_latest_valid_otp(email: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    """
                    SELECT * FROM email_otps 
                    WHERE email = %s AND is_used = FALSE AND expires_at > NOW()
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (email,),
                )
                return await cur.fetchone()

    @staticmethod
    async def increment_otp_attempts(otp_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("UPDATE email_otps SET attempts = attempts + 1 WHERE otp_id = %s", (otp_id,))

    @staticmethod
    async def mark_otp_used(otp_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("UPDATE email_otps SET is_used = TRUE WHERE otp_id = %s", (otp_id,))

    @staticmethod
    async def create_session(user_id: str, refresh_token: str, device_info: Optional[str], ip_address: Optional[str]) -> str:
        session_id = str(uuid.uuid4())
        expires_at = datetime.datetime.now() + datetime.timedelta(days=7)
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO sessions (session_id, user_id, refresh_token, device_info, ip_address, status, expires_at)
                    VALUES (%s, %s, %s, %s, %s, 'ACTIVE', %s)
                    """,
                    (session_id, user_id, refresh_token, device_info, ip_address, expires_at),
                )
        return session_id

    @staticmethod
    async def get_session_by_token(refresh_token: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM sessions WHERE refresh_token = %s AND status = 'ACTIVE' AND expires_at > NOW()",
                    (refresh_token,),
                )
                return await cur.fetchone()

    @staticmethod
    async def revoke_session(session_id: str, user_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE sessions SET status = 'REVOKED' WHERE session_id = %s AND user_id = %s",
                    (session_id, user_id),
                )

    @staticmethod
    async def list_active_sessions(user_id: str) -> List[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    """
                    SELECT session_id, device_info, ip_address, status, created_at, expires_at 
                    FROM sessions WHERE user_id = %s AND status = 'ACTIVE' ORDER BY created_at DESC
                    """,
                    (user_id,),
                )
                return await cur.fetchall()
