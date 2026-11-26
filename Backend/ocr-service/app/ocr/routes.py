from fastapi import APIRouter, Depends, UploadFile, File
from app.ocr.service import OcrService
from app.core.security import get_current_user_claims
from app.core.errors import success, AppError

router = APIRouter()

@router.post("/scan")
async def scan_receipt(
    file: UploadFile = File(...),
    claims: dict = Depends(get_current_user_claims),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise AppError("INVALID_FORMAT", "Dịch vụ OCR chỉ tiếp nhận định dạng tệp hình ảnh (JPEG, PNG)", status_code=400)
    
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise AppError("FILE_TOO_LARGE", "Kích thước ảnh hóa đơn không vượt quá 10MB", status_code=400)

    result = await OcrService.process_image_bytes(file_bytes, file.filename or "receipt.jpg")
    return success(data=result, message="Bóc tách thông tin hóa đơn thành công")
