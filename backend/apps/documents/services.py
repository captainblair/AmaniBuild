"""Documents and photos business logic."""

from collections import defaultdict

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum

from apps.companies.models import Company, CompanyMembership
from apps.core.exceptions import AmaniBuildAPIException
from apps.documents.models import LibraryAssetType, LibraryItem
from apps.projects.models import Project

User = get_user_model()


def get_project_for_company(company: Company, project_id) -> Project:
    project = Project.objects.filter(company=company, id=project_id, is_deleted=False).first()
    if not project:
        raise AmaniBuildAPIException("Project not found.", code="not_found")
    return project


def assert_valid_uploader(company: Company, user) -> None:
    if user is None:
        return
    is_member = CompanyMembership.objects.filter(
        company=company,
        user=user,
        is_active=True,
        is_deleted=False,
    ).exists()
    if not is_member and company.owner_id != user.id:
        raise AmaniBuildAPIException(
            "Uploader must be an active company member.",
            code="invalid_uploader",
        )


def get_library_item_or_404(company: Company, item_id) -> LibraryItem:
    item = (
        LibraryItem.objects.filter(company=company, id=item_id, is_deleted=False)
        .select_related("project", "uploaded_by")
        .first()
    )
    if not item:
        raise AmaniBuildAPIException("Library item not found.", code="not_found")
    return item


def apply_library_filters(queryset, request):
    project_id = request.query_params.get("project_id")
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    asset_type = request.query_params.get("asset_type")
    if asset_type:
        queryset = queryset.filter(asset_type=asset_type)

    document_type = request.query_params.get("document_type")
    if document_type:
        queryset = queryset.filter(document_type=document_type)

    folder = request.query_params.get("folder")
    if folder:
        queryset = queryset.filter(folder_path__icontains=folder)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(title__icontains=search)

    include_archived = request.query_params.get("include_archived", "false").lower() in {
        "true",
        "1",
        "yes",
    }
    if not include_archived:
        queryset = queryset.filter(is_archived=False)

    return queryset


def create_library_item(company: Company, user, data: dict) -> LibraryItem:
    assert_valid_uploader(company, user)
    project = None
    if data.get("project_id"):
        project = get_project_for_company(company, data["project_id"])

    return LibraryItem.objects.create(
        company=company,
        project=project,
        title=data["title"],
        description=data.get("description", ""),
        asset_type=data.get("asset_type", LibraryAssetType.DOCUMENT),
        document_type=data.get("document_type", "other"),
        folder_path=data.get("folder_path", ""),
        file_url=data.get("file_url", ""),
        file_extension=data.get("file_extension", ""),
        mime_type=data.get("mime_type", ""),
        size_bytes=data.get("size_bytes", 0),
        tags=data.get("tags", []),
        metadata=data.get("metadata", {}),
        captured_at=data.get("captured_at"),
        is_archived=data.get("is_archived", False),
        uploaded_by=user,
        version_number=1,
    )


def update_library_item(item: LibraryItem, company: Company, data: dict) -> LibraryItem:
    if "project_id" in data:
        project_id = data.get("project_id")
        item.project = get_project_for_company(company, project_id) if project_id else None

    scalar_fields = (
        "title",
        "description",
        "asset_type",
        "document_type",
        "folder_path",
        "file_url",
        "file_extension",
        "mime_type",
        "size_bytes",
        "tags",
        "metadata",
        "captured_at",
        "is_archived",
    )
    for field in scalar_fields:
        if field in data:
            setattr(item, field, data[field])
    item.save()
    return item


def create_new_version(item: LibraryItem, user, data: dict) -> LibraryItem:
    assert_valid_uploader(item.company, user)
    root_id = item.root_item_id
    family = LibraryItem.objects.filter(
        company=item.company,
        is_deleted=False,
    ).filter(Q(id=root_id) | Q(parent_item_id=root_id))
    current_max = family.aggregate(max_version=Max("version_number")).get("max_version") or item.version_number
    next_version = max(item.version_number + 1, int(current_max) + 1)

    LibraryItem.objects.filter(
        company=item.company,
        is_deleted=False,
    ).filter(Q(id=root_id) | Q(parent_item_id=root_id), is_current_version=True).update(
        is_current_version=False
    )

    return LibraryItem.objects.create(
        company=item.company,
        project=item.project,
        title=item.title,
        description=item.description,
        asset_type=item.asset_type,
        document_type=item.document_type,
        folder_path=item.folder_path,
        file_url=data.get("file_url", item.file_url),
        file_extension=data.get("file_extension", item.file_extension),
        mime_type=data.get("mime_type", item.mime_type),
        size_bytes=data.get("size_bytes", item.size_bytes),
        tags=item.tags,
        metadata=data.get("metadata", item.metadata),
        captured_at=item.captured_at,
        is_archived=item.is_archived,
        uploaded_by=user,
        version_number=next_version,
        parent_item_id=root_id,
        is_current_version=True,
    )


def get_library_summary(company: Company, queryset) -> dict:
    totals = queryset.aggregate(
        total_items=Count("id"),
        total_size=Sum("size_bytes"),
    )
    documents_count = queryset.filter(asset_type=LibraryAssetType.DOCUMENT).count()
    photos_count = queryset.filter(asset_type=LibraryAssetType.PHOTO).count()
    return {
        "total_items": totals["total_items"] or 0,
        "documents": documents_count,
        "photos": photos_count,
        "total_size_bytes": totals["total_size"] or 0,
    }


def get_folder_tree(queryset) -> list[dict]:
    grouped: dict[str, int] = defaultdict(int)
    for folder_path in queryset.values_list("folder_path", flat=True):
        key = (folder_path or "").strip() or "Unfiled"
        grouped[key] += 1
    return [{"folder": folder, "count": count} for folder, count in sorted(grouped.items())]


def get_photo_timeline(queryset) -> list[dict]:
    grouped: dict[str, list] = defaultdict(list)
    for item in queryset:
        source_dt = item.captured_at or item.created_at
        key = source_dt.strftime("%Y-%m")
        grouped[key].append(item)
    return [
        {"month": month, "count": len(items), "items": items}
        for month, items in sorted(grouped.items(), reverse=True)
    ]

