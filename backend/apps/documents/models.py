"""Document and photo library models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class LibraryAssetType(models.TextChoices):
    DOCUMENT = "document", "Document"
    PHOTO = "photo", "Photo"


class LibraryDocumentType(models.TextChoices):
    DRAWING = "drawing", "Drawing"
    CONTRACT = "contract", "Contract"
    REPORT = "report", "Report"
    INSPECTION = "inspection", "Inspection"
    RECEIPT = "receipt", "Receipt"
    OTHER = "other", "Other"


class LibraryItem(TenantScopedModel):
    """File metadata for project documents and site photos."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="library_items",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="library_items",
    )
    asset_type = models.CharField(
        max_length=16,
        choices=LibraryAssetType.choices,
        default=LibraryAssetType.DOCUMENT,
    )
    document_type = models.CharField(
        max_length=32,
        choices=LibraryDocumentType.choices,
        default=LibraryDocumentType.OTHER,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    folder_path = models.CharField(max_length=255, blank=True)
    file_url = models.URLField(blank=True)
    file_extension = models.CharField(max_length=20, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_library_items",
    )
    captured_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    version_number = models.PositiveIntegerField(default=1)
    parent_item = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="versions",
    )
    is_current_version = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "asset_type", "is_archived"]),
            models.Index(fields=["company", "document_type"]),
            models.Index(fields=["project", "asset_type"]),
            models.Index(fields=["company", "folder_path"]),
        ]

    def __str__(self):
        return f"{self.title} (v{self.version_number})"

    @property
    def root_item_id(self):
        return self.parent_item_id or self.id

