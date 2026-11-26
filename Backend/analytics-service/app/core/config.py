import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 8004))
    JWT_SECRET: str = os.getenv("JWT_SECRET", "finpulse_jwt_super_secret_key_2026")
    JWT_ALGORITHM: str = "HS256"
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "finpulse_internal_service_secret_token_2026")
    
    FINANCE_SERVICE_URL: str = os.getenv("FINANCE_SERVICE_URL", "http://finance-core-service:8002")
    CATEGORY_SERVICE_URL: str = os.getenv("CATEGORY_SERVICE_URL", "http://category-service:8003")

settings = Settings()
