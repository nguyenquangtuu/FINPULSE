import uuid
from typing import Optional, List, Dict, Any
import aiomysql
from app.core.database import db_pool

class CategoryRepository:
    @staticmethod
    async def get_by_id(category_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                if user_id:
                    sql = """
                    SELECT 
                        c.category_id,
                        c.user_id,
                        COALESCE(uco.name, c.name) AS name,
                        c.type,
                        COALESCE(uco.icon, c.icon) AS icon,
                        COALESCE(uco.color, c.color) AS color,
                        c.parent_id,
                        CASE 
                            WHEN c.user_id IS NULL THEN COALESCE(uco.is_archived, FALSE)
                            ELSE c.is_archived 
                        END AS is_archived,
                        c.created_at,
                        c.updated_at
                    FROM categories c
                    LEFT JOIN user_category_overrides uco 
                        ON c.category_id = uco.category_id AND uco.user_id = %s
                    WHERE c.category_id = %s
                    """
                    await cur.execute(sql, (user_id, category_id))
                else:
                    await cur.execute("SELECT * FROM categories WHERE category_id = %s", (category_id,))
                return await cur.fetchone()

    @staticmethod
    async def list_for_user(user_id: str, category_type: Optional[str] = None, include_archived: bool = False) -> List[Dict[str, Any]]:
        sql = """
        SELECT 
            c.category_id,
            c.user_id,
            COALESCE(uco.name, c.name) AS name,
            c.type,
            COALESCE(uco.icon, c.icon) AS icon,
            COALESCE(uco.color, c.color) AS color,
            c.parent_id,
            CASE 
                WHEN c.user_id IS NULL THEN COALESCE(uco.is_archived, FALSE)
                ELSE c.is_archived 
            END AS is_archived,
            c.created_at,
            c.updated_at
        FROM categories c
        LEFT JOIN user_category_overrides uco 
            ON c.category_id = uco.category_id AND uco.user_id = %s
        WHERE (c.user_id IS NULL OR c.user_id = %s)
        """
        params = [user_id, user_id]
        
        if not include_archived:
            sql += """
            AND (
                (c.user_id IS NOT NULL AND c.is_archived = FALSE) OR
                (c.user_id IS NULL AND (uco.is_archived IS NULL OR uco.is_archived = FALSE))
            )
            """
        if category_type:
            sql += " AND c.type = %s"
            params.append(category_type)
            
        sql += " ORDER BY c.parent_id ASC, name ASC"
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(sql, tuple(params))
                return await cur.fetchall()

    @staticmethod
    async def list_all_flat() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM categories ORDER BY parent_id ASC, name ASC"
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(sql)
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
        return await CategoryRepository.get_by_id(category_id, user_id)

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
    async def upsert_user_override(
        user_id: str,
        category_id: str,
        name: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        is_archived: Optional[bool] = None,
    ):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO user_category_overrides (user_id, category_id, name, icon, color, is_archived)
                    VALUES (%s, %s, %s, %s, %s, COALESCE(%s, FALSE))
                    ON DUPLICATE KEY UPDATE
                        name = COALESCE(%s, name),
                        icon = COALESCE(%s, icon),
                        color = COALESCE(%s, color),
                        is_archived = COALESCE(%s, is_archived)
                    """,
                    (user_id, category_id, name, icon, color, is_archived, name, icon, color, is_archived),
                )

    @staticmethod
    async def soft_delete(category_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("UPDATE categories SET is_archived = TRUE WHERE category_id = %s", (category_id,))

    @staticmethod
    async def restore(category_id: str):
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("UPDATE categories SET is_archived = FALSE WHERE category_id = %s", (category_id,))
