import uuid
import datetime
from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
import aiomysql
from app.core.database import db_pool
from app.core.errors import AppError

class FinanceRepository:
    # --- TRANSACTIONS ---
    @staticmethod
    async def get_transaction(transaction_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM transactions WHERE transaction_id = %s AND user_id = %s",
                    (transaction_id, user_id),
                )
                return await cur.fetchone()

    @staticmethod
    async def list_transactions(
        user_id: str,
        category_id: Optional[str] = None,
        trans_type: Optional[str] = None,
        from_date: Optional[datetime.datetime] = None,
        to_date: Optional[datetime.datetime] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        where_clauses = ["user_id = %s", "status = 'COMPLETED'"]
        params: List[Any] = [user_id]

        if category_id:
            where_clauses.append("category_id = %s")
            params.append(category_id)
        if trans_type:
            where_clauses.append("type = %s")
            params.append(trans_type)
        if from_date:
            where_clauses.append("transaction_date >= %s")
            params.append(from_date)
        if to_date:
            where_clauses.append("transaction_date <= %s")
            params.append(to_date)
        if keyword:
            where_clauses.append("note LIKE %s")
            params.append(f"%{keyword}%")

        where_sql = " AND ".join(where_clauses)
        offset = (page - 1) * limit

        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"SELECT COUNT(*) FROM transactions WHERE {where_sql}", tuple(params))
                total = (await cur.fetchone())[0]

            async with conn.cursor(aiomysql.DictCursor) as cur:
                sql = f"""
                    SELECT * FROM transactions 
                    WHERE {where_sql} 
                    ORDER BY transaction_date DESC, created_at DESC 
                    LIMIT %s OFFSET %s
                """
                await cur.execute(sql, tuple(params + [limit, offset]))
                items = await cur.fetchall()

        return items, total

    @staticmethod
    async def create_transaction_atomic(user_id: str, payload: dict) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Creates transaction and recalculates in-progress budgets in the SAME DB Transaction (ACID - BR-05).
        Returns the created transaction and a list of affected budgets with threshold alert triggers (BR-07).
        """
        transaction_id = str(uuid.uuid4())
        trans_date = payload.get("transaction_date") or datetime.datetime.now()
        amount = Decimal(str(payload["amount"]))
        trans_type = payload["type"]
        category_id = payload["category_id"]

        alerts_to_trigger = []

        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    # 1. Insert transaction
                    await cur.execute(
                        """
                        INSERT INTO transactions (
                            transaction_id, user_id, category_id, attachment_id,
                            amount, type, transaction_date, note, is_recurring, recurring_id, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'COMPLETED')
                        """,
                        (
                            transaction_id,
                            user_id,
                            category_id,
                            payload.get("attachment_id"),
                            amount,
                            trans_type,
                            trans_date,
                            payload.get("note", ""),
                            payload.get("is_recurring", False),
                            payload.get("recurring_id"),
                        ),
                    )

                # 2. In-DB Budget Recalculation if it is an EXPENSE
                if trans_type == "EXPENSE":
                    alerts_to_trigger = await FinanceRepository._check_and_update_budgets_atomic(
                        conn, user_id, category_id, trans_date
                    )

                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e

        created = await FinanceRepository.get_transaction(transaction_id, user_id)
        return created, alerts_to_trigger

    @staticmethod
    async def _check_and_update_budgets_atomic(
        conn, user_id: str, category_id: str, trans_date: datetime.datetime
    ) -> List[Dict[str, Any]]:
        alerts = []
        date_str = trans_date.strftime("%Y-%m-%d")

        async with conn.cursor(aiomysql.DictCursor) as cur:
            # Query all active budgets for this user that cover this date (category-specific OR overall)
            await cur.execute(
                """
                SELECT * FROM budgets 
                WHERE user_id = %s 
                  AND start_date <= %s AND end_date >= %s
                  AND (category_id = %s OR category_id IS NULL)
                FOR UPDATE
                """,
                (user_id, date_str, date_str, category_id),
            )
            budgets = await cur.fetchall()

            for b in budgets:
                b_cat = b["category_id"]
                # Sum all expenses in this budget window
                if b_cat:
                    await cur.execute(
                        """
                        SELECT COALESCE(SUM(amount), 0) as total_spent 
                        FROM transactions 
                        WHERE user_id = %s AND category_id = %s AND type = 'EXPENSE' AND status = 'COMPLETED'
                          AND transaction_date >= %s AND transaction_date <= %s
                        """,
                        (user_id, b_cat, f"{b['start_date']} 00:00:00", f"{b['end_date']} 23:59:59"),
                    )
                else:
                    await cur.execute(
                        """
                        SELECT COALESCE(SUM(amount), 0) as total_spent 
                        FROM transactions 
                        WHERE user_id = %s AND type = 'EXPENSE' AND status = 'COMPLETED'
                          AND transaction_date >= %s AND transaction_date <= %s
                        """,
                        (user_id, f"{b['start_date']} 00:00:00", f"{b['end_date']} 23:59:59"),
                    )
                
                spent_row = await cur.fetchone()
                spent = Decimal(str(spent_row["total_spent"]))
                limit = Decimal(str(b["amount_limit"]))
                pct = float((spent / limit) * 100) if limit > 0 else 0.0

                # Check thresholds (80%, 90%, 100%)
                threshold_to_alert = None
                if pct >= 100 and not b["alert_threshold_100"]:
                    threshold_to_alert = 100
                    await cur.execute("UPDATE budgets SET alert_threshold_100 = TRUE, alert_threshold_90 = TRUE, alert_threshold_80 = TRUE WHERE budget_id = %s", (b["budget_id"],))
                elif pct >= 90 and not b["alert_threshold_90"]:
                    threshold_to_alert = 90
                    await cur.execute("UPDATE budgets SET alert_threshold_90 = TRUE, alert_threshold_80 = TRUE WHERE budget_id = %s", (b["budget_id"],))
                elif pct >= 80 and not b["alert_threshold_80"]:
                    threshold_to_alert = 80
                    await cur.execute("UPDATE budgets SET alert_threshold_80 = TRUE WHERE budget_id = %s", (b["budget_id"],))

                if threshold_to_alert:
                    alerts.append({
                        "user_id": user_id,
                        "budget_id": b["budget_id"],
                        "category_id": b["category_id"],
                        "current_spent": float(spent),
                        "amount_limit": float(limit),
                        "percentage": round(pct, 1),
                        "threshold": threshold_to_alert,
                    })

        return alerts

    @staticmethod
    async def delete_transaction_atomic(transaction_id: str, user_id: str):
        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute(
                        "SELECT * FROM transactions WHERE transaction_id = %s AND user_id = %s FOR UPDATE",
                        (transaction_id, user_id),
                    )
                    trans = await cur.fetchone()
                    if not trans:
                        await conn.rollback()
                        return False

                    await cur.execute("DELETE FROM transactions WHERE transaction_id = %s", (transaction_id,))
                await conn.commit()
                return True
            except Exception as e:
                await conn.rollback()
                raise e

    # --- BUDGETS ---
    @staticmethod
    async def get_budget(budget_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM budgets WHERE budget_id = %s AND user_id = %s", (budget_id, user_id))
                return await cur.fetchone()

    @staticmethod
    async def list_budgets(user_id: str) -> List[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM budgets WHERE user_id = %s ORDER BY start_date DESC",
                    (user_id,),
                )
                budgets = await cur.fetchall()

                # Calculate real-time consumption for each budget
                for b in budgets:
                    b_cat = b["category_id"]
                    if b_cat:
                        await cur.execute(
                            """
                            SELECT COALESCE(SUM(amount), 0) as total_spent 
                            FROM transactions 
                            WHERE user_id = %s AND category_id = %s AND type = 'EXPENSE' AND status = 'COMPLETED'
                              AND transaction_date >= %s AND transaction_date <= %s
                            """,
                            (user_id, b_cat, f"{b['start_date']} 00:00:00", f"{b['end_date']} 23:59:59"),
                        )
                    else:
                        await cur.execute(
                            """
                            SELECT COALESCE(SUM(amount), 0) as total_spent 
                            FROM transactions 
                            WHERE user_id = %s AND type = 'EXPENSE' AND status = 'COMPLETED'
                              AND transaction_date >= %s AND transaction_date <= %s
                            """,
                            (user_id, f"{b['start_date']} 00:00:00", f"{b['end_date']} 23:59:59"),
                        )
                    spent_row = await cur.fetchone()
                    spent = Decimal(str(spent_row["total_spent"]))
                    limit = Decimal(str(b["amount_limit"]))
                    b["spent_amount"] = spent
                    b["remaining_amount"] = max(Decimal(0), limit - spent)
                    b["percentage"] = round(float((spent / limit) * 100), 2) if limit > 0 else 0.0

                return budgets

    @staticmethod
    async def create_budget(user_id: str, payload: dict) -> Dict[str, Any]:
        budget_id = str(uuid.uuid4())
        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        INSERT INTO budgets (
                            budget_id, user_id, category_id, amount_limit, period, start_date, end_date
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            budget_id,
                            user_id,
                            payload.get("category_id"),
                            payload["amount_limit"],
                            payload.get("period", "MONTH"),
                            payload["start_date"],
                            payload["end_date"],
                        ),
                    )
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e

        return await FinanceRepository.get_budget(budget_id, user_id)

    @staticmethod
    async def update_budget(budget_id: str, user_id: str, payload: dict) -> Dict[str, Any]:
        existing = await FinanceRepository.get_budget(budget_id, user_id)
        if not existing:
            raise AppError("BUDGET_NOT_FOUND", "Không tìm thấy ngân sách cần cập nhật", status_code=404)

        updates = []
        params = []
        if "category_id" in payload:
            updates.append("category_id = %s")
            params.append(payload["category_id"])
        if "amount_limit" in payload and payload["amount_limit"] is not None:
            updates.append("amount_limit = %s")
            params.append(payload["amount_limit"])
        if "period" in payload and payload["period"]:
            updates.append("period = %s")
            params.append(payload["period"])
        if "start_date" in payload and payload["start_date"]:
            updates.append("start_date = %s")
            params.append(payload["start_date"])
        if "end_date" in payload and payload["end_date"]:
            updates.append("end_date = %s")
            params.append(payload["end_date"])

        if updates:
            params.extend([budget_id, user_id])
            sql = f"UPDATE budgets SET {', '.join(updates)} WHERE budget_id = %s AND user_id = %s"
            async with db_pool.acquire() as conn:
                await conn.begin()
                try:
                    async with conn.cursor() as cur:
                        await cur.execute(sql, tuple(params))
                    await conn.commit()
                except Exception as e:
                    await conn.rollback()
                    raise e

        return await FinanceRepository.get_budget(budget_id, user_id)

    @staticmethod
    async def delete_budget(budget_id: str, user_id: str):
        existing = await FinanceRepository.get_budget(budget_id, user_id)
        if not existing:
            raise AppError("BUDGET_NOT_FOUND", "Không tìm thấy ngân sách cần xóa", status_code=404)

        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute("DELETE FROM budgets WHERE budget_id = %s AND user_id = %s", (budget_id, user_id))
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e

    # --- RECURRING RULES ---
    @staticmethod
    async def list_due_recurring_rules() -> List[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM recurring_rules WHERE is_active = TRUE AND next_run_date <= CURDATE()"
                )
                return await cur.fetchall()

    @staticmethod
    async def update_recurring_next_run(recurring_id: str, next_date: datetime.date):
        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "UPDATE recurring_rules SET next_run_date = %s WHERE recurring_id = %s",
                        (next_date, recurring_id),
                    )
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e

    @staticmethod
    async def create_recurring_rule(user_id: str, payload: dict) -> Dict[str, Any]:
        recurring_id = str(uuid.uuid4())
        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        INSERT INTO recurring_rules (
                            recurring_id, user_id, category_id, amount, type, note, frequency, next_run_date, is_active
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                        """,
                        (
                            recurring_id,
                            user_id,
                            payload["category_id"],
                            payload["amount"],
                            payload["type"],
                            payload.get("note", ""),
                            payload["frequency"],
                            payload["next_run_date"],
                        ),
                    )
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e

        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM recurring_rules WHERE recurring_id = %s", (recurring_id,))
                return await cur.fetchone()
