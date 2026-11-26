import logging
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.core.errors import (
    AppError,
    app_error_handler,
    http_error_handler,
    validation_error_handler,
    generic_error_handler,
)
from app.notifications.routes import router as notification_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="FINPULSE notification-service",
    version="1.0.0",
    description="Microservice trung tâm thông báo thời gian thực (WebSocket & Email SMTP)",
    lifespan=lifespan,
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

app.include_router(notification_router, prefix="/api/notifications", tags=["Notifications"])

@app.websocket("/ws")
async def root_ws(websocket: WebSocket, token: Optional[str] = None):
    from app.notifications.routes import websocket_notifications
    await websocket_notifications(websocket, token)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "notification-service"}
