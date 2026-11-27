import uuid
import datetime
from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
import aiomysql
import httpx
from app.core.database import db_pool
from app.core.config import settings
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
    async def create_transaction_atomic(
        user_id: str, payload: dict
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        transaction_id = str(uuid.uuid4())
        amount = Decimal(str(payload["amount"]))
        trans_type = payload["type"]
        category_id = payload.get("category_id")
        trans_date = payload.get("transaction_date") or datetime.datetime.now()
        wallet_id = payload.get("wallet_id")
        to_wallet_id = payload.get("to_wallet_id")
        alerts_to_trigger = []

        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    # If wallet_id not provided, assign user's default wallet
                    if not wallet_id:
                        await cur.execute(
                            "SELECT wallet_id FROM wallets WHERE user_id = %s AND status = 'ACTIVE' ORDER BY is_default DESC LIMIT 1",
                            (user_id,),
                        )
                        def_w = await cur.fetchone()
                        if def_w:
                            wallet_id = def_w["wallet_id"]

                    # 1. Insert Transaction
                    await cur.execute(
                        """
                        INSERT INTO transactions (
                            transaction_id, user_id, category_id, wallet_id, to_wallet_id,
                            attachment_id, amount, type, transaction_date, note, is_recurring, recurring_id
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            transaction_id,
                            user_id,
                            category_id,
                            wallet_id,
                            to_wallet_id,
                            payload.get("attachment_id"),
                            amount,
                            trans_type,
                            trans_date,
                            payload.get("note", ""),
                            payload.get("is_recurring", False),
                            payload.get("recurring_id"),
                        ),
                    )

                    # 2. Update Wallet Balance
                    if trans_type == "INCOME" and wallet_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                            (amount, wallet_id, user_id),
                        )
                    elif trans_type == "EXPENSE" and wallet_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                            (amount, wallet_id, user_id),
                        )
                    elif trans_type == "TRANSFER":
                        if wallet_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                                (amount, wallet_id, user_id),
                            )
                        if to_wallet_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                                (amount, to_wallet_id, user_id),
                            )

                    # 3. In-DB Budget Recalculation if it is an EXPENSE
                    if trans_type == "EXPENSE" and category_id:
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
    async def update_transaction_atomic(
        transaction_id: str, user_id: str, payload: dict
    ) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        alerts_to_trigger = []
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
                        return None, []

                    # Revert old balance
                    old_type = trans["type"]
                    old_amount = trans["amount"]
                    old_wallet_id = trans["wallet_id"]
                    old_to_wallet_id = trans["to_wallet_id"]

                    if old_type == "INCOME" and old_wallet_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                            (old_amount, old_wallet_id, user_id),
                        )
                    elif old_type == "EXPENSE" and old_wallet_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                            (old_amount, old_wallet_id, user_id),
                        )
                    elif old_type == "TRANSFER":
                        if old_wallet_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                                (old_amount, old_wallet_id, user_id),
                            )
                        if old_to_wallet_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                                (old_amount, old_to_wallet_id, user_id),
                            )

                    # Compute new fields
                    new_type = payload.get("type", old_type)
                    new_amount = Decimal(str(payload["amount"])) if "amount" in payload and payload["amount"] is not None else old_amount
                    new_wallet_id = payload.get("wallet_id", old_wallet_id)
                    new_to_wallet_id = payload.get("to_wallet_id", old_to_wallet_id)

                    # Apply new balance
                    if new_type == "INCOME" and new_wallet_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                            (new_amount, new_wallet_id, user_id),
                        )
                    elif new_type == "EXPENSE" and new_wallet_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                            (new_amount, new_wallet_id, user_id),
                        )
                    elif new_type == "TRANSFER":
                        if new_wallet_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                                (new_amount, new_wallet_id, user_id),
                            )
                        if new_to_wallet_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                                (new_amount, new_to_wallet_id, user_id),
                            )

                    updates = []
                    params = []
                    for field in ["category_id", "wallet_id", "to_wallet_id", "attachment_id", "amount", "type", "transaction_date", "note"]:
                        if field in payload and payload[field] is not None:
                            updates.append(f"{field} = %s")
                            params.append(payload[field])

                    if updates:
                        params.extend([transaction_id, user_id])
                        sql = f"UPDATE transactions SET {', '.join(updates)} WHERE transaction_id = %s AND user_id = %s"
                        await cur.execute(sql, tuple(params))

                    # Re-check budget if updated transaction is expense
                    final_cat = payload.get("category_id", trans["category_id"])
                    final_date = payload.get("transaction_date", trans["transaction_date"])
                    if new_type == "EXPENSE" and final_cat:
                        alerts_to_trigger = await FinanceRepository._check_and_update_budgets_atomic(
                            conn, user_id, final_cat, final_date
                        )

                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e

        updated = await FinanceRepository.get_transaction(transaction_id, user_id)
        return updated, alerts_to_trigger

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

                    # Revert wallet balance
                    amount = trans["amount"]
                    w_id = trans.get("wallet_id")
                    to_w_id = trans.get("to_wallet_id")
                    t_type = trans["type"]

                    if t_type == "INCOME" and w_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                            (amount, w_id, user_id),
                        )
                    elif t_type == "EXPENSE" and w_id:
                        await cur.execute(
                            "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                            (amount, w_id, user_id),
                        )
                    elif t_type == "TRANSFER":
                        if w_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s AND user_id = %s",
                                (amount, w_id, user_id),
                            )
                        if to_w_id:
                            await cur.execute(
                                "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s AND user_id = %s",
                                (amount, to_w_id, user_id),
                            )

                    await cur.execute("DELETE FROM transactions WHERE transaction_id = %s", (transaction_id,))
                await conn.commit()
                return True
            except Exception as e:
                await conn.rollback()
                raise e

    # --- CATEGORY HIERARCHY HELPER ---
    @staticmethod
    async def fetch_category_hierarchy() -> Tuple[Dict[str, List[str]], Dict[str, str]]:
        children_map: Dict[str, List[str]] = {}
        parent_map: Dict[str, str] = {}
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{settings.CATEGORY_SERVICE_URL}/api/categories/internal/all/list",
                    headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY},
                )
                if resp.status_code == 200:
                    items = resp.json().get("data", [])
                    for item in items:
                        cid = item["category_id"]
                        pid = item.get("parent_id")
                        if pid:
                            parent_map[cid] = pid
                            if pid not in children_map:
                                children_map[pid] = []
                            children_map[pid].append(cid)
        except Exception:
            pass
        return children_map, parent_map

    @staticmethod
    async def _get_spent_for_cats(
        cur, user_id: str, category_ids: List[str], start_date: Any, end_date: Any
    ) -> Decimal:
        if category_ids:
            fmt = ",".join(["%s"] * len(category_ids))
            sql = f"""
            SELECT COALESCE(SUM(amount), 0) as total_spent 
            FROM transactions 
            WHERE user_id = %s AND category_id IN ({fmt}) AND type = 'EXPENSE' AND status = 'COMPLETED'
              AND transaction_date >= %s AND transaction_date <= %s
            """
            params = [user_id] + list(category_ids) + [f"{start_date} 00:00:00", f"{end_date} 23:59:59"]
            await cur.execute(sql, tuple(params))
        else:
            await cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0) as total_spent 
                FROM transactions 
                WHERE user_id = %s AND type = 'EXPENSE' AND status = 'COMPLETED'
                  AND transaction_date >= %s AND transaction_date <= %s
                """,
                (user_id, f"{start_date} 00:00:00", f"{end_date} 23:59:59"),
            )
        row = await cur.fetchone()
        return Decimal(str(row["total_spent"]))

    # --- BUDGETS ---
    @staticmethod
    async def _check_and_update_budgets_atomic(
        conn, user_id: str, category_id: str, trans_date: datetime.datetime
    ) -> List[Dict[str, Any]]:
        alerts = []
        date_str = trans_date.strftime("%Y-%m-%d") if isinstance(trans_date, (datetime.datetime, datetime.date)) else str(trans_date)[:10]

        children_map, parent_map = await FinanceRepository.fetch_category_hierarchy()
        related_cat_ids = [category_id]
        if category_id in parent_map:
            related_cat_ids.append(parent_map[category_id])

        async with conn.cursor(aiomysql.DictCursor) as cur:
            fmt = ",".join(["%s"] * len(related_cat_ids))
            sql = f"""
            SELECT * FROM budgets 
            WHERE user_id = %s 
              AND start_date <= %s AND end_date >= %s
              AND (category_id IN ({fmt}) OR category_id IS NULL)
            FOR UPDATE
            """
            params = [user_id, date_str, date_str] + related_cat_ids
            await cur.execute(sql, tuple(params))
            budgets = await cur.fetchall()

            for b in budgets:
                b_cat = b["category_id"]
                family_cat_ids = ([b_cat] + children_map.get(b_cat, [])) if b_cat else []
                spent = await FinanceRepository._get_spent_for_cats(
                    cur, user_id, family_cat_ids, b["start_date"], b["end_date"]
                )
                
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
                        "threshold": threshold_to_alert,
                        "current_spent": float(spent),
                        "amount_limit": float(limit),
                        "percentage": round(pct, 2),
                    })

        return alerts

    @staticmethod
    async def get_budget(budget_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM budgets WHERE budget_id = %s AND user_id = %s",
                    (budget_id, user_id),
                )
                return await cur.fetchone()

    @staticmethod
    async def list_budgets(user_id: str) -> List[Dict[str, Any]]:
        children_map, _ = await FinanceRepository.fetch_category_hierarchy()

        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM budgets WHERE user_id = %s ORDER BY start_date DESC",
                    (user_id,),
                )
                budgets = await cur.fetchall()

                # Calculate real-time consumption for each budget (including child categories)
                for b in budgets:
                    b_cat = b["category_id"]
                    family_cat_ids = ([b_cat] + children_map.get(b_cat, [])) if b_cat else []
                    spent = await FinanceRepository._get_spent_for_cats(
                        cur, user_id, family_cat_ids, b["start_date"], b["end_date"]
                    )
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

    # --- WALLETS & ACCOUNTS ---
    @staticmethod
    async def list_wallets(user_id: str) -> List[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM wallets WHERE user_id = %s AND status = 'ACTIVE' ORDER BY is_default DESC, created_at ASC",
                    (user_id,),
                )
                return await cur.fetchall()

    @staticmethod
    async def get_wallet(wallet_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    "SELECT * FROM wallets WHERE wallet_id = %s AND user_id = %s",
                    (wallet_id, user_id),
                )
                return await cur.fetchone()

    @staticmethod
    async def create_wallet(user_id: str, payload: dict) -> Dict[str, Any]:
        wallet_id = str(uuid.uuid4())
        name = payload["name"]
        wallet_type = payload.get("wallet_type", "CASH")
        initial_balance = Decimal(str(payload.get("initial_balance", 0)))
        currency = payload.get("currency", "VND")
        icon = payload.get("icon", "Wallet")
        color = payload.get("color", "#10B981")
        is_default = payload.get("is_default", False)

        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    if is_default:
                        await cur.execute("UPDATE wallets SET is_default = FALSE WHERE user_id = %s", (user_id,))
                    await cur.execute(
                        """
                        INSERT INTO wallets (
                            wallet_id, user_id, name, wallet_type, balance, 
                            initial_balance, currency, icon, color, is_default, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE')
                        """,
                        (wallet_id, user_id, name, wallet_type, initial_balance, initial_balance, currency, icon, color, is_default),
                    )
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e
        return await FinanceRepository.get_wallet(wallet_id, user_id)

    @staticmethod
    async def update_wallet(wallet_id: str, user_id: str, payload: dict) -> Optional[Dict[str, Any]]:
        updates = []
        params = []
        if "name" in payload and payload["name"] is not None:
            updates.append("name = %s")
            params.append(payload["name"])
        if "wallet_type" in payload and payload["wallet_type"] is not None:
            updates.append("wallet_type = %s")
            params.append(payload["wallet_type"])
        if "icon" in payload and payload["icon"] is not None:
            updates.append("icon = %s")
            params.append(payload["icon"])
        if "color" in payload and payload["color"] is not None:
            updates.append("color = %s")
            params.append(payload["color"])
        if "is_default" in payload and payload["is_default"] is not None:
            updates.append("is_default = %s")
            params.append(payload["is_default"])

        if updates:
            async with db_pool.acquire() as conn:
                await conn.begin()
                try:
                    async with conn.cursor() as cur:
                        if payload.get("is_default"):
                            await cur.execute("UPDATE wallets SET is_default = FALSE WHERE user_id = %s", (user_id,))
                        params.extend([wallet_id, user_id])
                        sql = f"UPDATE wallets SET {', '.join(updates)} WHERE wallet_id = %s AND user_id = %s"
                        await cur.execute(sql, tuple(params))
                    await conn.commit()
                except Exception as e:
                    await conn.rollback()
                    raise e
        return await FinanceRepository.get_wallet(wallet_id, user_id)

    @staticmethod
    async def archive_wallet(wallet_id: str, user_id: str) -> bool:
        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "UPDATE wallets SET status = 'ARCHIVED' WHERE wallet_id = %s AND user_id = %s",
                        (wallet_id, user_id),
                    )
                await conn.commit()
                return True
            except Exception as e:
                await conn.rollback()
                raise e

    @staticmethod
    async def create_transfer_atomic(
        user_id: str, from_wallet_id: str, to_wallet_id: str, amount: Decimal, note: str, trans_date: datetime.datetime
    ) -> Dict[str, Any]:
        if from_wallet_id == to_wallet_id:
            raise AppError("INVALID_TRANSFER", "Ví nguồn và ví đích không được trùng nhau", status_code=400)

        transaction_id = str(uuid.uuid4())
        async with db_pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    # Lock and check from_wallet
                    await cur.execute(
                        "SELECT * FROM wallets WHERE wallet_id = %s AND user_id = %s FOR UPDATE",
                        (from_wallet_id, user_id),
                    )
                    from_w = await cur.fetchone()
                    if not from_w:
                        raise AppError("WALLET_NOT_FOUND", "Không tìm thấy ví nguồn", status_code=404)

                    # Lock and check to_wallet
                    await cur.execute(
                        "SELECT * FROM wallets WHERE wallet_id = %s AND user_id = %s FOR UPDATE",
                        (to_wallet_id, user_id),
                    )
                    to_w = await cur.fetchone()
                    if not to_w:
                        raise AppError("WALLET_NOT_FOUND", "Không tìm thấy ví đích", status_code=404)

                    # Deduct from from_wallet, add to to_wallet
                    await cur.execute(
                        "UPDATE wallets SET balance = balance - %s WHERE wallet_id = %s",
                        (amount, from_wallet_id),
                    )
                    await cur.execute(
                        "UPDATE wallets SET balance = balance + %s WHERE wallet_id = %s",
                        (amount, to_wallet_id),
                    )

                    # Insert transfer transaction record
                    transfer_note = note or f"Chuyển tiền: {from_w['name']} -> {to_w['name']}"
                    await cur.execute(
                        """
                        INSERT INTO transactions (
                            transaction_id, user_id, category_id, wallet_id, to_wallet_id,
                            amount, type, transaction_date, note, status
                        ) VALUES (%s, %s, NULL, %s, %s, %s, 'TRANSFER', %s, %s, 'COMPLETED')
                        """,
                        (transaction_id, user_id, from_wallet_id, to_wallet_id, amount, trans_date, transfer_note),
                    )
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e
        return await FinanceRepository.get_transaction(transaction_id, user_id)
