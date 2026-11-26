from typing import Optional
from fastapi import Header, HTTPException, status
import jwt
from app.core.config import settings
from app.core.errors import AppError

def get_current_user_claims(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
) -> dict:
    if x_user_id:
        return {"sub": x_user_id, "role": x_user_role or "USER", "email": x_user_email or ""}
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError("UNAUTHORIZED", "Missing authorization credentials", status_code=status.HTTP_401_UNAUTHORIZED)
    token = authorization.split(" ")[1]
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return claims
    except Exception:
        raise AppError("INVALID_TOKEN", "Invalid or expired token", status_code=status.HTTP_401_UNAUTHORIZED)

def verify_internal_key(x_internal_service_key: Optional[str] = Header(None)):
    if not x_internal_service_key or x_internal_service_key != settings.INTERNAL_SERVICE_KEY:
        raise AppError("FORBIDDEN", "Invalid internal service token", status_code=status.HTTP_403_FORBIDDEN)
