from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(INCOME|EXPENSE)$")
    icon: Optional[str] = "folder"
    color: Optional[str] = "#3B82F6"
    parent_id: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[str] = None

class CategoryResponse(BaseModel):
    category_id: str
    user_id: Optional[str] = None
    name: str
    type: str
    icon: str
    color: str
    parent_id: Optional[str] = None
    is_archived: bool
    is_system: bool = False
    children: Optional[List["CategoryResponse"]] = None
    created_at: Optional[datetime] = None
