import logging
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import (
    AppError,
    app_error_handler,
    http_error_handler,
    validation_error_handler,
    generic_error_handler,
)
from app.analytics.routes import router as analytics_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

app = FastAPI(
    title="FINPULSE analytics-service",
    version="1.0.0",
    description="Microservice phân tích dòng tiền, trực quan hóa biểu đồ & xuất báo cáo PDF/XLSX/CSV",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(HTTPException, http_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, generic_error_handler)

app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics & Reports"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "analytics-service"}
