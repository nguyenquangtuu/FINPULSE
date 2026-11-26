import uuid
from typing import Optional, List, Dict, Any
import aiomysql
from app.core.database import db_pool

class CategoryRepository:
    @staticmethod
    async def get_by_id(category_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM categories WHERE category_id = %s", (category_id,))
                return await cur.fetchone()

    @staticmethod
    async def list_for_user(user_id: str, category_type: Optional[str] = None, include_archived: bool = False) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM categories WHERE (user_id IS NULL OR user_id = %s)"
        params = [user_id]
        
        if not include_archived:
            sql += " AND is_archived = FALSE"
        if category_type:
            sql += " AND type = %s"
            params.append(category_type)
            
        sql += " ORDER BY parent_id ASC, name ASC"
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(sql, tuple(params))
                return await cur.fetchall()

    @staticmethod
    async def create(user_id: Optional[str], name: str, category_type: str, icon: str, color: str, parent_id: Optional[str]) -> Dict[str, Any]:
        category_id = str(uuid.uuid4())
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO categories (category_id, user_id, name, type, icon, color, parent_id, is_archived)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, FALSE)
                    """,
                    (category_id, user_id, name, category_type, icon, color, parent_id),
                )
        return await CategoryRepository.get_by_id(category_id)

    @staticmethod
    async def update(category_id: str, name: Optional[str], icon: Optional[str], color: Optional[str], parent_id: Optional[str]) -> Dict[str, Any]:
        updates = []
        params = []
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if icon is not None:
            updates.append("icon = %s")
            params.append(icon)
        if color is not None:
            updates.append("color = %s")
            params.append(color)
        if parent_id is not None:
            updates.append("parent_id = %s")
            params.append(parent_id if parent_id != "" else None)
            
        if not updates:
            return await CategoryRepository.get_by_id(category_id)
            
        params.append(category_id)
        sql = f"UPDATE categories SET {', '.join(updates)} WHERE category_id = %s"
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, tuple(params))
        return await CategoryRepository.get_by_id(category_id)

    @staticmethod
    async def soft_delete(category_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("UPDATE categories SET is_archived = TRUE WHERE category_id = %s", (category_id,))
