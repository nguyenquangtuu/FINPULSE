import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 8003))
    
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", 8552))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "rootpassword")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "category_db")
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "finpulse_jwt_super_secret_key_2026")
    JWT_ALGORITHM: str = "HS256"
    
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "finpulse_internal_service_secret_token_2026")

settings = Settings()
