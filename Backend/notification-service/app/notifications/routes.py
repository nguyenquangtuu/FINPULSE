from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from app.notifications.schemas import (
    BudgetAlertPayload,
    ReminderPayload,
    NotificationPreferenceUpdate,
)
from app.notifications.service import NotificationService
from app.notifications.repository import NotificationRepository
from app.core.websocket import ws_manager
from app.core.security import get_current_user_claims, verify_internal_key, decode_token
from app.core.errors import success, AppError

router = APIRouter()

# --- WEB APP NOTIFICATION CENTER ---
@router.get("")
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    claims: dict = Depends(get_current_user_claims),
):
    notifications = await NotificationRepository.list_for_user(claims["sub"], limit)
    return success(data=notifications)

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    await NotificationRepository.mark_as_read(notification_id, claims["sub"])
    return success(message="Đã đánh dấu đã đọc")

@router.put("/read-all")
async def mark_all_notifications_read(claims: dict = Depends(get_current_user_claims)):
    await NotificationRepository.mark_all_as_read(claims["sub"])
    return success(message="Đã đánh dấu đọc tất cả thông báo")

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    await NotificationRepository.delete(notification_id, claims["sub"])
    return success(message="Xóa thông báo thành công")

@router.get("/preferences")
async def get_preferences(claims: dict = Depends(get_current_user_claims)):
    prefs = await NotificationRepository.get_preferences(claims["sub"])
    return success(data=prefs)

@router.put("/preferences")
async def update_preferences(
    payload: NotificationPreferenceUpdate,
    claims: dict = Depends(get_current_user_claims),
):
    updated = await NotificationRepository.update_preferences(claims["sub"], payload.model_dump(exclude_unset=True))
    return success(data=updated, message="Cập nhật cài đặt thông báo thành công")

# --- INTERNAL INTER-SERVICE CALLS ---
@router.post("/internal/budget-alert", dependencies=[Depends(verify_internal_key)])
async def trigger_budget_alert_internal(payload: BudgetAlertPayload):
    record = await NotificationService.process_budget_alert(payload.model_dump())
    return success(data=record, message="Xử lý cảnh báo ngân sách thành công")

@router.post("/internal/remind-daily", dependencies=[Depends(verify_internal_key)])
async def trigger_daily_reminder_internal(payload: ReminderPayload):
    if payload.user_id:
        record = await NotificationService.process_daily_reminder(payload.user_id, payload.title, payload.content)
        return success(data=record, message="Gửi nhắc nhở thành công")
    count = await NotificationService.broadcast_daily_reminder(payload.title, payload.content)
    return success(data={"sent_count": count}, message=f"Đã gửi nhắc nhở tới {count} người dùng")

# --- WEBSOCKET REAL-TIME ENDPOINT ---
@router.websocket("/ws")
async def websocket_notifications(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=1008)
        return
    try:
        claims = decode_token(token)
        user_id = claims["sub"]
    except Exception:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection open / listen for heartbeat ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
