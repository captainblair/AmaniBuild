from django.contrib import admin

from apps.documents.models import LibraryItem


@admin.register(LibraryItem)
class LibraryItemAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "asset_type",
        "document_type",
        "project",
        "company",
        "version_number",
        "is_current_version",
        "uploaded_by",
        "created_at",
    )
    list_filter = ("asset_type", "document_type", "is_archived", "is_current_version")
    search_fields = ("title", "folder_path", "project__name", "company__name")

