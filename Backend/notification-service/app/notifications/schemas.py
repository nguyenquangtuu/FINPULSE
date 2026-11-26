from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class BudgetAlertPayload(BaseModel):
    user_id: str
    budget_id: str
    category_name: str
    threshold: int
    current_spent: float
    amount_limit: float
    percentage: float

class ReminderPayload(BaseModel):
    user_id: Optional[str] = None
    title: str
    content: str

class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    type: str
    title: str
    content: str
    data: Optional[Any] = None
    is_read: bool
    created_at: Optional[datetime] = None

class NotificationPreferenceUpdate(BaseModel):
    email_alerts_enabled: Optional[bool] = None
    daily_reminder_enabled: Optional[bool] = None
    daily_reminder_time: Optional[str] = None
