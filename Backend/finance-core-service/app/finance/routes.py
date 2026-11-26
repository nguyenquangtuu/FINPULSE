from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from app.finance.schemas import (
    TransactionCreate,
    TransactionUpdate,
    BudgetCreate,
    BudgetUpdate,
    RecurringRuleCreate,
)
from app.finance.service import FinanceService
from app.finance.repository import FinanceRepository
from app.core.security import get_current_user_claims, verify_internal_key
from app.core.errors import success, AppError

router = APIRouter()

# --- TRANSACTIONS ---
@router.post("/transactions")
async def create_transaction(
    payload: TransactionCreate,
    claims: dict = Depends(get_current_user_claims),
):
    created = await FinanceService.create_transaction(
        user_id=claims["sub"],
        payload=payload.model_dump(),
    )
    return success(data=created, message="Ghi nhận giao dịch thành công")

@router.get("/transactions")
async def list_transactions(
    category_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None, pattern="^(INCOME|EXPENSE)$"),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    claims: dict = Depends(get_current_user_claims),
):
    items, total = await FinanceRepository.list_transactions(
        user_id=claims["sub"],
        category_id=category_id,
        trans_type=type,
        from_date=from_date,
        to_date=to_date,
        keyword=keyword,
        page=page,
        limit=limit,
    )
    return success(data={"items": items, "total": total, "page": page, "limit": limit})

@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    trans = await FinanceRepository.get_transaction(transaction_id, claims["sub"])
    if not trans:
        raise AppError("TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch", status_code=404)
    return success(data=trans)

@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    deleted = await FinanceRepository.delete_transaction_atomic(transaction_id, claims["sub"])
    if not deleted:
        raise AppError("TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch hoặc không có quyền xóa", status_code=404)
    return success(message="Xóa giao dịch thành công")

# --- BUDGETS ---
@router.post("/budgets")
async def create_budget(
    payload: BudgetCreate,
    claims: dict = Depends(get_current_user_claims),
):
    budget = await FinanceRepository.create_budget(claims["sub"], payload.model_dump())
    return success(data=budget, message="Thiết lập ngân sách thành công")

@router.get("/budgets")
async def list_budgets(claims: dict = Depends(get_current_user_claims)):
    budgets = await FinanceRepository.list_budgets(claims["sub"])
    return success(data=budgets)

# --- RECURRING RULES ---
@router.post("/recurring")
async def create_recurring(
    payload: RecurringRuleCreate,
    claims: dict = Depends(get_current_user_claims),
):
    rule = await FinanceRepository.create_recurring_rule(claims["sub"], payload.model_dump())
    return success(data=rule, message="Thiết lập giao dịch định kỳ thành công")

# --- INTERNAL INTER-SERVICE ENDPOINTS ---
@router.post("/internal/recurring/execute-due", dependencies=[Depends(verify_internal_key)])
async def execute_recurring_internal():
    res = await FinanceService.execute_due_recurring()
    return success(data=res, message="Thực thi quét giao dịch định kỳ thành công")

@router.get("/internal/user-transactions", dependencies=[Depends(verify_internal_key)])
async def get_user_transactions_internal(
    user_id: str = Query(...),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
):
    items, total = await FinanceRepository.list_transactions(
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        page=1,
        limit=5000,
    )
    return success(data=items)
