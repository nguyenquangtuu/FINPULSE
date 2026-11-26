import uuid
from typing import Optional, List, Dict, Any
import aiomysql
from app.core.database import db_pool

class AttachmentRepository:
    @staticmethod
    async def get_by_id(attachment_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM attachments WHERE attachment_id = %s", (attachment_id,))
                return await cur.fetchone()

    @staticmethod
    async def create(
        user_id: str,
        file_name: str,
        file_type: str,
        file_size: int,
        storage_key: str,
        transaction_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        attachment_id = str(uuid.uuid4())
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO attachments (attachment_id, user_id, transaction_id, file_name, file_type, file_size, storage_key, storage_provider)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'MINIO')
                    """,
                    (attachment_id, user_id, transaction_id, file_name, file_type, file_size, storage_key),
                )
        return await AttachmentRepository.get_by_id(attachment_id)

    @staticmethod
    async def link_transaction(attachment_id: str, transaction_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE attachments SET transaction_id = %s WHERE attachment_id = %s",
                    (transaction_id, attachment_id),
                )

    @staticmethod
    async def delete(attachment_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM attachments WHERE attachment_id = %s", (attachment_id,))
