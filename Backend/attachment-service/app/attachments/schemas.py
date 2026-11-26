from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AttachmentResponse(BaseModel):
    attachment_id: str
    user_id: str
    transaction_id: Optional[str] = None
    file_name: str
    file_type: str
    file_size: int
    storage_key: str
    storage_provider: str
    presigned_url: Optional[str] = None
    created_at: Optional[datetime] = None
