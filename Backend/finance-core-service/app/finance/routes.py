from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from app.finance.schemas import (
    TransactionCreate,
    TransactionUpdate,
    BudgetCreate,
    BudgetUpdate,
    RecurringRuleCreate,
    WalletCreate,
    WalletUpdate,
    TransferCreate,
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
    type: Optional[str] = Query(None, pattern="^(INCOME|EXPENSE|TRANSFER)$"),
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

@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    claims: dict = Depends(get_current_user_claims),
):
    updated = await FinanceService.update_transaction(
        transaction_id=transaction_id,
        user_id=claims["sub"],
        payload=payload.model_dump(exclude_unset=True),
    )
    return success(data=updated, message="Cập nhật giao dịch thành công")

@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    deleted = await FinanceRepository.delete_transaction_atomic(transaction_id, claims["sub"])
    if not deleted:
        raise AppError("TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch hoặc không có quyền xóa", status_code=404)
    return success(message="Xóa giao dịch thành công")

# --- TRANSFERS ---
@router.post("/transfers")
async def create_transfer(
    payload: TransferCreate,
    claims: dict = Depends(get_current_user_claims),
):
    result = await FinanceService.create_transfer(claims["sub"], payload.model_dump())
    return success(data=result, message="Chuyển tiền giữa các ví thành công")

# --- WALLETS ---
@router.get("/wallets")
async def list_wallets(claims: dict = Depends(get_current_user_claims)):
    result = await FinanceService.list_wallets_with_summary(claims["sub"])
    return success(data=result)

@router.post("/wallets")
async def create_wallet(
    payload: WalletCreate,
    claims: dict = Depends(get_current_user_claims),
):
    created = await FinanceRepository.create_wallet(claims["sub"], payload.model_dump())
    return success(data=created, message="Tạo ví tài khoản thành công")

@router.get("/wallets/{wallet_id}")
async def get_wallet(
    wallet_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    wallet = await FinanceRepository.get_wallet(wallet_id, claims["sub"])
    if not wallet:
        raise AppError("WALLET_NOT_FOUND", "Không tìm thấy ví", status_code=404)
    return success(data=wallet)

@router.put("/wallets/{wallet_id}")
async def update_wallet(
    wallet_id: str,
    payload: WalletUpdate,
    claims: dict = Depends(get_current_user_claims),
):
    updated = await FinanceRepository.update_wallet(wallet_id, claims["sub"], payload.model_dump(exclude_unset=True))
    if not updated:
        raise AppError("WALLET_NOT_FOUND", "Không tìm thấy ví", status_code=404)
    return success(data=updated, message="Cập nhật thông tin ví thành công")

@router.delete("/wallets/{wallet_id}")
async def archive_wallet(
    wallet_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    archived = await FinanceRepository.archive_wallet(wallet_id, claims["sub"])
    if not archived:
        raise AppError("WALLET_NOT_FOUND", "Không tìm thấy ví", status_code=404)
    return success(message="Lưu trữ ví thành công")

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

@router.put("/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    payload: BudgetUpdate,
    claims: dict = Depends(get_current_user_claims),
):
    updated = await FinanceRepository.update_budget(
        budget_id=budget_id,
        user_id=claims["sub"],
        payload=payload.model_dump(exclude_unset=True),
    )
    return success(data=updated, message="Cập nhật hạn mức ngân sách thành công")

@router.delete("/budgets/{budget_id}")
async def delete_budget(
    budget_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    await FinanceRepository.delete_budget(budget_id, claims["sub"])
    return success(message="Xóa hạn mức ngân sách thành công")

# --- RECURRING TRANSACTIONS ---
@router.post("/recurring")
async def create_recurring_rule(
    payload: RecurringRuleCreate,
    claims: dict = Depends(get_current_user_claims),
):
    created = await FinanceRepository.create_recurring_rule(claims["sub"], payload.model_dump())
    return success(data=created, message="Thiết lập giao dịch định kỳ thành công")

@router.get("/recurring")
async def list_recurring_rules(claims: dict = Depends(get_current_user_claims)):
    rules = await FinanceRepository.list_recurring_rules(claims["sub"])
    return success(data=rules)

@router.delete("/recurring/{recurring_id}")
async def delete_recurring_rule(
    recurring_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    deleted = await FinanceRepository.delete_recurring_rule(recurring_id, claims["sub"])
    if not deleted:
        raise AppError("RULE_NOT_FOUND", "Không tìm thấy giao dịch định kỳ", status_code=404)
    return success(message="Hủy giao dịch định kỳ thành công")

# --- INTERNAL INTER-SERVICE CALLS ---
@router.post("/internal/recurring/execute-due", dependencies=[Depends(verify_internal_key)])
async def execute_due_recurring_internal():
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
