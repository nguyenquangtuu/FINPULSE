from app.auth.repository import AuthRepository
from app.core.security import generate_otp, create_access_token, create_refresh_token, decode_token
from app.core.email import send_otp_email
from app.core.errors import AppError

class AuthService:
    @staticmethod
    async def request_register(email: str, full_name: str) -> dict:
        existing_user = await AuthRepository.get_user_by_email(email)
        if existing_user:
            raise AppError("EMAIL_EXISTS", "Email đã tồn tại trên hệ thống, vui lòng chọn đăng nhập", status_code=400)
        
        otp_code = generate_otp()
        await AuthRepository.save_otp(email, otp_code, "REGISTER", full_name)
        await send_otp_email(email, otp_code, "REGISTER")
        return {"message": "Mã OTP kích hoạt đã được gửi tới email của bạn", "email": email}

    @staticmethod
    async def request_login(email: str) -> dict:
        user = await AuthRepository.get_user_by_email(email)
        if not user:
            raise AppError("USER_NOT_FOUND", "Email chưa được đăng ký trong hệ thống", status_code=404)
        if user["status"] == "LOCKED":
            raise AppError("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa tạm thời", status_code=403)
        if user["status"] == "INACTIVE":
            raise AppError("ACCOUNT_INACTIVE", "Tài khoản chưa được kích hoạt", status_code=403)
        
        otp_code = generate_otp()
        await AuthRepository.save_otp(email, otp_code, "LOGIN")
        await send_otp_email(email, otp_code, "LOGIN")
        return {"message": "Mã OTP đăng nhập đã được gửi tới email của bạn", "email": email}

    @staticmethod
    async def verify_otp(email: str, otp_code: str, device_info: str = "Web", ip_address: str = "127.0.0.1") -> dict:
        otp_record = await AuthRepository.get_latest_valid_otp(email)
        if not otp_record:
            raise AppError("OTP_EXPIRED", "Mã OTP không hợp lệ hoặc đã hết hạn", status_code=400)
        
        if otp_record["attempts"] >= 3:
            raise AppError("OTP_MAX_ATTEMPTS", "Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới", status_code=400)

        if otp_record["otp_code"] != otp_code:
            await AuthRepository.increment_otp_attempts(otp_record["otp_id"])
            raise AppError("OTP_INVALID", "Mã OTP không chính xác", status_code=400)

        # Đánh dấu OTP đã sử dụng
        await AuthRepository.mark_otp_used(otp_record["otp_id"])

        # Nếu là luồng đăng ký mới
        user = await AuthRepository.get_user_by_email(email)
        if not user:
            full_name = otp_record.get("full_name") or "User"
            user = await AuthRepository.create_user(full_name=full_name, email=email)

        if user["status"] != "ACTIVE":
            raise AppError("ACCOUNT_NOT_ACTIVE", "Tài khoản không ở trạng thái hoạt động", status_code=403)

        access_token = create_access_token(user["user_id"], user["email"], user["role"])
        refresh_token = create_refresh_token(user["user_id"])
        
        await AuthRepository.create_session(user["user_id"], refresh_token, device_info, ip_address)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "user": user,
        }

    @staticmethod
    async def refresh_access_token(refresh_token: str) -> dict:
        claims = decode_token(refresh_token)
        if claims.get("type") != "refresh":
            raise AppError("INVALID_TOKEN", "Yêu cầu refresh token hợp lệ", status_code=401)
        
        session = await AuthRepository.get_session_by_token(refresh_token)
        if not session:
            raise AppError("SESSION_REVOKED", "Phiên đăng nhập đã bị thu hồi hoặc hết hạn", status_code=401)

        user = await AuthRepository.get_user_by_id(session["user_id"])
        if not user or user["status"] != "ACTIVE":
            raise AppError("USER_UNAVAILABLE", "Người dùng không khả dụng", status_code=403)

        new_access_token = create_access_token(user["user_id"], user["email"], user["role"])
        return {
            "access_token": new_access_token,
            "token_type": "Bearer",
        }
