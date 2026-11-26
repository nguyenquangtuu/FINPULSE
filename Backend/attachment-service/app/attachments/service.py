import uuid
from app.attachments.repository import AttachmentRepository
from app.core.storage import upload_file_bytes, generate_presigned_url, delete_file_object
from app.core.errors import AppError

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}

MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB (BR-08)

class AttachmentService:
    @staticmethod
    async def upload_attachment(user_id: str, file_name: str, content_type: str, file_bytes: bytes) -> dict:
        if content_type not in ALLOWED_MIME_TYPES:
            raise AppError("INVALID_FILE_TYPE", "Chỉ hỗ trợ tệp ảnh (JPEG, PNG) hoặc tài liệu PDF (BR-08)", status_code=400)
        
        file_size = len(file_bytes)
        if file_size > MAX_FILE_SIZE:
            raise AppError("FILE_TOO_LARGE", "Dung lượng tệp vượt quá giới hạn cho phép (tối đa 10MB - BR-08)", status_code=400)

        # Generate storage key
        file_ext = file_name.split(".")[-1] if "." in file_name else "bin"
        storage_key = f"{user_id}/{uuid.uuid4()}.{file_ext}"

        # Upload to MinIO
        try:
            upload_file_bytes(file_bytes, storage_key, content_type)
        except Exception as e:
            raise AppError("STORAGE_ERROR", f"Không thể lưu trữ tệp tin lên MinIO: {str(e)}", status_code=500)

        # Save metadata
        record = await AttachmentRepository.create(
            user_id=user_id,
            file_name=file_name,
            file_type=content_type,
            file_size=file_size,
            storage_key=storage_key,
        )

        record["presigned_url"] = generate_presigned_url(storage_key, expires_in=900)
        return record

    @staticmethod
    async def get_attachment_url(attachment_id: str, user_id: str) -> dict:
        record = await AttachmentRepository.get_by_id(attachment_id)
        if not record or record["user_id"] != user_id:
            raise AppError("NOT_FOUND", "Không tìm thấy tệp đính kèm hoặc không có quyền truy cập", status_code=404)
        
        url = generate_presigned_url(record["storage_key"], expires_in=900)
        record["presigned_url"] = url
        return record

    @staticmethod
    async def delete_attachment(attachment_id: str, user_id: str):
        record = await AttachmentRepository.get_by_id(attachment_id)
        if not record or record["user_id"] != user_id:
            raise AppError("NOT_FOUND", "Không tìm thấy tệp đính kèm hoặc không có quyền xóa", status_code=404)
        
        try:
            delete_file_object(record["storage_key"])
        except Exception:
            pass

        await AttachmentRepository.delete(attachment_id)
