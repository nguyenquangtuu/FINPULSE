from fastapi import APIRouter, Depends, UploadFile, File
from app.attachments.service import AttachmentService
from app.core.security import get_current_user_claims, verify_internal_key
from app.core.errors import success

router = APIRouter()

@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    claims: dict = Depends(get_current_user_claims),
):
    contents = await file.read()
    result = await AttachmentService.upload_attachment(
        user_id=claims["sub"],
        file_name=file.filename or "receipt.jpg",
        content_type=file.content_type or "image/jpeg",
        file_bytes=contents,
    )
    return success(data=result, message="Tải lên tệp chứng từ thành công")

@router.get("/{attachment_id}/url")
async def get_attachment_url(
    attachment_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    result = await AttachmentService.get_attachment_url(attachment_id, claims["sub"])
    return success(data=result)

@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    claims: dict = Depends(get_current_user_claims),
):
    await AttachmentService.delete_attachment(attachment_id, claims["sub"])
    return success(message="Xóa tệp chứng từ thành công")

# Internal endpoint for finance-core or ocr-service
@router.get("/internal/{attachment_id}", dependencies=[Depends(verify_internal_key)])
async def get_attachment_internal(attachment_id: str):
    from app.attachments.repository import AttachmentRepository
    from app.core.storage import generate_presigned_url
    from app.core.errors import AppError
    
    rec = await AttachmentRepository.get_by_id(attachment_id)
    if not rec:
        raise AppError("NOT_FOUND", "Không tìm thấy tệp đính kèm", status_code=404)
    rec["presigned_url"] = generate_presigned_url(rec["storage_key"])
    return success(data=rec)
