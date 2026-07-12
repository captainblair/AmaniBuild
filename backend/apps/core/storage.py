"""Storage helpers for MinIO / S3-compatible object storage."""

from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile


def storage_is_configured() -> bool:
    return getattr(settings, "USE_S3_STORAGE", False)


def get_media_upload_path(instance, filename: str) -> str:
    """Default upload path pattern for tenant-scoped files."""
    company_id = getattr(instance, "company_id", None) or "shared"
    return f"uploads/{company_id}/{filename}"


def save_library_upload(company_id, uploaded: UploadedFile) -> dict:
    """
    Persist an uploaded library file to default storage (local MEDIA or MinIO/S3).
    Returns metadata suitable for LibraryItem create/version payloads.
    """
    original_name = Path(uploaded.name or "upload.bin").name
    extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    safe_name = f"{uuid.uuid4().hex}_{original_name}"
    storage_path = f"library/{company_id}/{safe_name}"
    saved_path = default_storage.save(storage_path, uploaded)
    file_url = default_storage.url(saved_path)
    return {
        "file_url": file_url,
        "file_extension": extension,
        "mime_type": uploaded.content_type or "",
        "size_bytes": int(getattr(uploaded, "size", 0) or 0),
        "storage_path": saved_path,
        "original_name": original_name,
    }
