import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 8007))
    
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", 8552))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "rootpassword")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "notification_db")
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "finpulse_jwt_super_secret_key_2026")
    JWT_ALGORITHM: str = "HS256"
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "finpulse_internal_service_secret_token_2026")
    
    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 1025))
    MAIL_FROM: str = os.getenv("MAIL_FROM", "noreply@finpulse.local")
    
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")

settings = Settings()
