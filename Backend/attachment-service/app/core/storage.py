import logging
import boto3
from botocore.client import Config
from app.core.config import settings

logger = logging.getLogger("attachment-service.storage")

def get_s3_client():
    endpoint_url = f"http://{settings.MINIO_ENDPOINT}"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )

def ensure_bucket_exists():
    try:
        s3 = get_s3_client()
        buckets = s3.list_buckets().get("Buckets", [])
        bucket_names = [b["Name"] for b in buckets]
        if settings.MINIO_BUCKET not in bucket_names:
            s3.create_bucket(Bucket=settings.MINIO_BUCKET)
            logger.info(f"Created MinIO bucket '{settings.MINIO_BUCKET}'")
        else:
            logger.info(f"MinIO bucket '{settings.MINIO_BUCKET}' already exists")
    except Exception as e:
        logger.warning(f"Failed to verify/create MinIO bucket on startup: {e}")

def upload_file_bytes(file_bytes: bytes, storage_key: str, content_type: str):
    s3 = get_s3_client()
    s3.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=storage_key,
        Body=file_bytes,
        ContentType=content_type,
    )

def generate_presigned_url(storage_key: str, expires_in: int = 900) -> str:
    s3 = get_s3_client()
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.MINIO_BUCKET, "Key": storage_key},
        ExpiresIn=expires_in,
    )
    # If accessed externally by client browser, rewrite host to public endpoint if different
    if settings.MINIO_PUBLIC_ENDPOINT and settings.MINIO_ENDPOINT != settings.MINIO_PUBLIC_ENDPOINT:
        url = url.replace(settings.MINIO_ENDPOINT, settings.MINIO_PUBLIC_ENDPOINT)
    return url

def delete_file_object(storage_key: str):
    s3 = get_s3_client()
    s3.delete_object(Bucket=settings.MINIO_BUCKET, Key=storage_key)
