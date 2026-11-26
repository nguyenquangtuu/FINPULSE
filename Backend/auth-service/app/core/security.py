import random
import string
import datetime
import jwt
from typing import Optional
from fastapi import Header, HTTPException, status
from app.core.config import settings
from app.core.errors import AppError

def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))

def create_access_token(user_id: str, email: str, role: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AppError("TOKEN_EXPIRED", "Token has expired", status_code=status.HTTP_401_UNAUTHORIZED)
    except jwt.InvalidTokenError:
        raise AppError("TOKEN_INVALID", "Invalid token signature", status_code=status.HTTP_401_UNAUTHORIZED)

def get_current_user_claims(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
) -> dict:
    if x_user_id:
        return {"sub": x_user_id, "role": x_user_role or "USER", "email": x_user_email or ""}
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError("UNAUTHORIZED", "Missing or invalid authorization header", status_code=status.HTTP_401_UNAUTHORIZED)
    token = authorization.split(" ")[1]
    claims = decode_token(token)
    if claims.get("type") != "access":
        raise AppError("INVALID_TOKEN_TYPE", "Access token required", status_code=status.HTTP_401_UNAUTHORIZED)
    return claims

def verify_internal_key(x_internal_service_key: Optional[str] = Header(None)):
    if not x_internal_service_key or x_internal_service_key != settings.INTERNAL_SERVICE_KEY:
        raise AppError("FORBIDDEN", "Invalid internal service token", status_code=status.HTTP_403_FORBIDDEN)
