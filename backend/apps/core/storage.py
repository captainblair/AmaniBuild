"""Storage helpers for MinIO / S3-compatible object storage."""

from django.conf import settings


def storage_is_configured() -> bool:
    return getattr(settings, "USE_S3_STORAGE", False)


def get_media_upload_path(instance, filename: str) -> str:
    """
    Default upload path pattern for tenant-scoped files.
    Phase 10 will namespace by company/project.
    """
    return f"uploads/{filename}"
