import logging
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import jwt
import httpx
import websockets

from app.config import settings
from app.forwarder import forward_request

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
logger = logging.getLogger("api-gateway")

app = FastAPI(
    title="FINPULSE API Gateway",
    version="1.0.0",
    description="Cổng API tập trung điều phối toàn bộ cụm Vi dịch vụ FINPULSE",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_PREFIXES = (
    "/api/auth/register-request",
    "/api/auth/login-request",
    "/api/auth/verify-otp",
    "/api/auth/refresh-token",
    "/health",
    "/docs",
    "/openapi.json",
)

SERVICE_ROUTES = {
    "/api/auth": settings.AUTH_SERVICE_URL,
    "/api/finance": settings.FINANCE_SERVICE_URL,
    "/api/categories": settings.CATEGORY_SERVICE_URL,
    "/api/analytics": settings.ANALYTICS_SERVICE_URL,
    "/api/attachments": settings.ATTACHMENT_SERVICE_URL,
    "/api/ocr": settings.OCR_SERVICE_URL,
    "/api/notifications": settings.NOTIFICATION_SERVICE_URL,
}

@app.middleware("http")
async def gateway_auth_and_proxy_middleware(request: Request, call_next):
    path = request.url.path

    # Let native gateway health check or docs pass directly
    if path == "/health":
        return JSONResponse({"status": "ok", "service": "api-gateway"})

    # Check which service this request targets
    target_base = None
    for prefix, base_url in SERVICE_ROUTES.items():
        if path.startswith(prefix):
            target_base = base_url
            break

    if not target_base:
        return await call_next(request)

    # Authentication validation
    is_public = any(path.startswith(pub) for pub in PUBLIC_PREFIXES)
    injected_headers = {
        "X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY,
    }

    if not is_public:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Yêu cầu Bearer Token xác thực"}},
            )
        token = auth_header.split(" ")[1]
        try:
            claims = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            injected_headers["X-User-Id"] = claims["sub"]
            injected_headers["X-User-Role"] = claims.get("role", "USER")
            injected_headers["X-User-Email"] = claims.get("email", "")
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": {"code": "TOKEN_EXPIRED", "message": "Access Token đã hết hạn"}},
            )
        except Exception:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": {"code": "INVALID_TOKEN", "message": "Token không hợp lệ"}},
            )

    # Forward to target microservice
    target_url = f"{target_base}{path}"
    try:
        return await forward_request(target_url, request, injected_headers)
    except httpx.ConnectError:
        return JSONResponse(
            status_code=503,
            content={"success": False, "error": {"code": "SERVICE_UNAVAILABLE", "message": f"Dịch vụ đích tại {target_base} tạm thời không phản hồi"}},
        )
    except Exception as e:
        logger.error(f"Error forwarding to {target_url}: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": {"code": "GATEWAY_ERROR", "message": str(e)}},
        )

# Proxy WebSocket connections directly to notification-service
@app.websocket("/ws")
@app.websocket("/api/notifications/ws")
async def websocket_proxy(client_ws: WebSocket):
    token = client_ws.query_params.get("token")
    if not token:
        await client_ws.close(code=1008)
        return

    # Verify token
    try:
        jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        await client_ws.close(code=1008)
        return

    await client_ws.accept()

    # Connect to notification service backend websocket
    backend_url = settings.NOTIFICATION_SERVICE_URL.replace("http://", "ws://").replace("https://", "wss://")
    target_ws_url = f"{backend_url}/ws?token={token}"

    try:
        async with websockets.connect(target_ws_url) as server_ws:
            import asyncio

            async def client_to_server():
                try:
                    while True:
                        msg = await client_ws.receive_text()
                        await server_ws.send(msg)
                except Exception:
                    pass

            async def server_to_client():
                try:
                    while True:
                        msg = await server_ws.recv()
                        await client_ws.send_text(msg)
                except Exception:
                    pass

            await asyncio.gather(client_to_server(), server_to_client())
    except Exception as e:
        logger.warning(f"WebSocket proxy disconnected: {e}")
    finally:
        try:
            await client_ws.close()
        except Exception:
            pass
