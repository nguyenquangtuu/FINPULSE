from fastapi import APIRouter, Depends, Request
from app.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    VerifyOtpRequest,
    RefreshTokenRequest,
    UpdateProfileRequest,
)
from app.auth.service import AuthService
from app.auth.repository import AuthRepository
from app.core.security import get_current_user_claims, verify_internal_key
from app.core.errors import success, AppError

router = APIRouter()

@router.post("/register-request")
async def register_request(payload: RegisterRequest):
    result = await AuthService.request_register(payload.email, payload.full_name)
    return success(data=result, message="Yêu cầu đăng ký đã được tiếp nhận")

@router.post("/login-request")
async def login_request(payload: LoginRequest):
    result = await AuthService.request_login(payload.email)
    return success(data=result, message="Yêu cầu gửi OTP đăng nhập thành công")

@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpRequest, request: Request):
    ip = request.client.host if request.client else "127.0.0.1"
    result = await AuthService.verify_otp(
        email=payload.email,
        otp_code=payload.otp_code,
        device_info=payload.device_info or "Web Browser",
        ip_address=ip,
    )
    return success(data=result, message="Xác thực đăng nhập thành công")

@router.post("/refresh-token")
async def refresh_token(payload: RefreshTokenRequest):
    result = await AuthService.refresh_access_token(payload.refresh_token)
    return success(data=result, message="Làm mới token thành công")

@router.get("/me")
async def get_my_profile(claims: dict = Depends(get_current_user_claims)):
    user = await AuthRepository.get_user_by_id(claims["sub"])
    if not user:
        raise AppError("USER_NOT_FOUND", "Không tìm thấy thông tin người dùng", status_code=404)
    return success(data=user)

@router.put("/me")
async def update_my_profile(
    payload: UpdateProfileRequest,
    claims: dict = Depends(get_current_user_claims),
):
    user = await AuthRepository.update_user(
        user_id=claims["sub"],
        full_name=payload.full_name,
        currency=payload.currency,
        avatar_url=payload.avatar_url,
    )
    return success(data=user, message="Cập nhật hồ sơ thành công")

@router.get("/sessions")
async def get_active_sessions(claims: dict = Depends(get_current_user_claims)):
    sessions = await AuthRepository.list_active_sessions(claims["sub"])
    return success(data=sessions)

@router.post("/sessions/{session_id}/revoke")
async def revoke_session(session_id: str, claims: dict = Depends(get_current_user_claims)):
    await AuthRepository.revoke_session(session_id, claims["sub"])
    return success(message="Thu hồi phiên đăng nhập thành công")

# Internal endpoint for other microservices
@router.get("/internal/users/active", dependencies=[Depends(verify_internal_key)])
async def get_active_users_internal():
    users = await AuthRepository.list_active_users()
    return success(data=users)

@router.get("/internal/users/{user_id}", dependencies=[Depends(verify_internal_key)])
async def get_user_internal(user_id: str):
    user = await AuthRepository.get_user_by_id(user_id)
    if not user:
        raise AppError("USER_NOT_FOUND", "Không tìm thấy người dùng", status_code=404)
    return success(data=user)
