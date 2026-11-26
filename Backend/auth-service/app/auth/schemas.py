import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z0-9\.\-]+$")

class EmailBase(BaseModel):
    email: str = Field(..., description="Địa chỉ email")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Địa chỉ email không đúng định dạng")
        return v

class RegisterRequest(EmailBase):
    full_name: str = Field(..., min_length=2, max_length=150)

class LoginRequest(EmailBase):
    pass

class VerifyOtpRequest(EmailBase):
    otp_code: str = Field(..., min_length=6, max_length=6)
    device_info: Optional[str] = "Web Browser"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    currency: Optional[str] = Field(None, pattern="^(VND|USD)$")
    avatar_url: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    status: str
    role: str
    currency: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: UserResponse
