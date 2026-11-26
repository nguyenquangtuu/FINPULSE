import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 8000))
    JWT_SECRET: str = os.getenv("JWT_SECRET", "finpulse_jwt_super_secret_key_2026")
    JWT_ALGORITHM: str = "HS256"
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "finpulse_internal_service_secret_token_2026")
    
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    FINANCE_SERVICE_URL: str = os.getenv("FINANCE_SERVICE_URL", "http://finance-core-service:8002")
    CATEGORY_SERVICE_URL: str = os.getenv("CATEGORY_SERVICE_URL", "http://category-service:8003")
    ANALYTICS_SERVICE_URL: str = os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8004")
    ATTACHMENT_SERVICE_URL: str = os.getenv("ATTACHMENT_SERVICE_URL", "http://attachment-service:8005")
    OCR_SERVICE_URL: str = os.getenv("OCR_SERVICE_URL", "http://ocr-service:8006")
    NOTIFICATION_SERVICE_URL: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8007")

settings = Settings()
