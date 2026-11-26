import logging
from email.message import EmailMessage
import aiosmtplib
from app.core.config import settings

logger = logging.getLogger("notification-service.email")

async def send_alert_email(to_email: str, subject: str, message_body: str):
    msg = EmailMessage()
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(message_body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
        )
        logger.info(f"Delivered alert email to {to_email}: {subject}")
    except Exception as e:
        logger.warning(f"Failed to send email via SMTP ({settings.SMTP_HOST}:{settings.SMTP_PORT}): {e}")
