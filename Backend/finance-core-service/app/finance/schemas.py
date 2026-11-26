from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

class TransactionCreate(BaseModel):
    category_id: str
    amount: Decimal = Field(..., gt=0, description="Số tiền phát sinh bắt buộc phải lớn hơn 0 (BR-04)")
    type: str = Field(..., pattern="^(INCOME|EXPENSE)$")
    transaction_date: Optional[datetime] = None
    note: Optional[str] = ""
    attachment_id: Optional[str] = None

class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    type: Optional[str] = Field(None, pattern="^(INCOME|EXPENSE)$")
    transaction_date: Optional[datetime] = None
    note: Optional[str] = None
    attachment_id: Optional[str] = None

class TransactionResponse(BaseModel):
    transaction_id: str
    user_id: str
    category_id: str
    attachment_id: Optional[str] = None
    amount: Decimal
    type: str
    transaction_date: datetime
    note: Optional[str] = None
    is_recurring: bool = False
    recurring_id: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

class BudgetCreate(BaseModel):
    category_id: Optional[str] = None # None means overall total spending budget
    amount_limit: Decimal = Field(..., gt=0)
    period: str = Field("MONTH", pattern="^(WEEK|MONTH|YEAR)$")
    start_date: date
    end_date: date

class BudgetUpdate(BaseModel):
    category_id: Optional[str] = None
    amount_limit: Optional[Decimal] = Field(None, gt=0)
    period: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class BudgetResponse(BaseModel):
    budget_id: str
    user_id: str
    category_id: Optional[str] = None
    amount_limit: Decimal
    period: str
    start_date: date
    end_date: date
    spent_amount: Decimal = Decimal(0)
    remaining_amount: Decimal = Decimal(0)
    percentage: float = 0.0
    alert_threshold_80: bool = False
    alert_threshold_90: bool = False
    alert_threshold_100: bool = False

class RecurringRuleCreate(BaseModel):
    category_id: str
    amount: Decimal = Field(..., gt=0)
    type: str = Field(..., pattern="^(INCOME|EXPENSE)$")
    frequency: str = Field(..., pattern="^(DAILY|WEEKLY|MONTHLY)$")
    next_run_date: date
    note: Optional[str] = ""

class RecurringRuleResponse(BaseModel):
    recurring_id: str
    user_id: str
    category_id: str
    amount: Decimal
    type: str
    frequency: str
    next_run_date: date
    note: Optional[str] = None
    is_active: bool
