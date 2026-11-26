import logging
from email.message import EmailMessage
import aiosmtplib
from app.core.config import settings

logger = logging.getLogger("auth-service.email")

async def send_otp_email(to_email: str, otp_code: str, otp_type: str = "LOGIN"):
    subject = "[FINPULSE] Mã xác thực đăng nhập" if otp_type == "LOGIN" else "[FINPULSE] Mã kích hoạt tài khoản"
    body = f"""Xin chào,

Mã OTP xác thực của bạn cho nền tảng FINPULSE là: {otp_code}

Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai để bảo vệ an toàn tài khoản.

Trân trọng,
Đội ngũ FINPULSE Platform
"""
    msg = EmailMessage()
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
        )
        logger.info(f"Sent {otp_type} OTP email to {to_email}")
    except Exception as e:
        logger.warning(f"Could not deliver email via SMTP ({settings.SMTP_HOST}:{settings.SMTP_PORT}): {e}. Local fallback log: OTP={otp_code} for {to_email}")
