"""Documents and photos API views."""

from rest_framework import status
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanManageDocuments, CanViewDocuments
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.documents.models import LibraryAssetType, LibraryItem
from apps.documents.serializers import (
    LibraryItemCreateUpdateSerializer,
    LibraryItemListSerializer,
    LibraryItemSerializer,
    LibraryItemVersionSerializer,
    LibraryVersionCreateSerializer,
)
from apps.core.storage import save_library_upload
from apps.documents.services import (
    apply_library_filters,
    create_library_item,
    create_new_version,
    get_folder_tree,
    get_library_item_or_404,
    get_library_summary,
    get_photo_timeline,
    update_library_item,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _library_queryset(company):
    return LibraryItem.objects.filter(company=company, is_deleted=False).select_related("project", "uploaded_by")


class LibraryListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageDocuments()]
        return [IsAuthenticated(), CanViewDocuments()]

    @extend_schema(tags=["Documents"])
    def get(self, request):
        queryset = apply_library_filters(_library_queryset(request.company), request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at"), request)
        response = paginator.get_paginated_response(LibraryItemListSerializer(page, many=True).data)
        response.data["summary"] = get_library_summary(request.company, queryset)
        return response

    @extend_schema(request=LibraryItemCreateUpdateSerializer, tags=["Documents"])
    def post(self, request):
        serializer = LibraryItemCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "title" not in serializer.validated_data:
            raise AmaniBuildAPIException("title is required.", code="validation_error")
        item = create_library_item(request.company, request.user, serializer.validated_data)
        return _success({"item": LibraryItemSerializer(item).data}, status.HTTP_201_CREATED)


class LibraryFileUploadView(APIView):
    permission_classes = [IsAuthenticated, CanManageDocuments]

    @extend_schema(tags=["Documents"])
    def post(self, request):
        uploaded = request.FILES.get("file")
        if not uploaded:
            raise AmaniBuildAPIException("file is required.", code="validation_error")
        if uploaded.size and uploaded.size > 50 * 1024 * 1024:
            raise AmaniBuildAPIException("File exceeds 50MB limit.", code="validation_error")

        saved = save_library_upload(request.company.id, uploaded)
        file_url = saved["file_url"]
        if file_url.startswith("/"):
            file_url = request.build_absolute_uri(file_url)

        return _success(
            {
                "file_url": file_url,
                "file_extension": saved["file_extension"],
                "mime_type": saved["mime_type"],
                "size_bytes": saved["size_bytes"],
                "original_name": saved["original_name"],
            },
            status.HTTP_201_CREATED,
        )


class LibraryFoldersView(APIView):
    permission_classes = [IsAuthenticated, CanViewDocuments]

    @extend_schema(tags=["Documents"])
    def get(self, request):
        queryset = apply_library_filters(_library_queryset(request.company), request)
        return _success({"folders": get_folder_tree(queryset)})


class PhotosTimelineView(APIView):
    permission_classes = [IsAuthenticated, CanViewDocuments]

    @extend_schema(tags=["Documents"])
    def get(self, request):
        queryset = apply_library_filters(_library_queryset(request.company), request).filter(
            asset_type=LibraryAssetType.PHOTO
        )
        timeline = get_photo_timeline(queryset.order_by("-captured_at", "-created_at"))
        payload = [
            {
                "month": row["month"],
                "count": row["count"],
                "items": LibraryItemListSerializer(row["items"], many=True).data,
            }
            for row in timeline
        ]
        return _success({"timeline": payload})


class LibraryItemDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewDocuments()]
        return [IsAuthenticated(), CanManageDocuments()]

    @extend_schema(tags=["Documents"])
    def get(self, request, item_id):
        item = get_library_item_or_404(request.company, item_id)
        return _success({"item": LibraryItemSerializer(item).data})

    @extend_schema(request=LibraryItemCreateUpdateSerializer, tags=["Documents"])
    def patch(self, request, item_id):
        item = get_library_item_or_404(request.company, item_id)
        serializer = LibraryItemCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = update_library_item(item, request.company, serializer.validated_data)
        return _success({"item": LibraryItemSerializer(item).data})

    @extend_schema(tags=["Documents"])
    def delete(self, request, item_id):
        item = get_library_item_or_404(request.company, item_id)
        item.soft_delete()
        return _success({"message": "Library item deleted."})


class LibraryItemVersionsView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageDocuments()]
        return [IsAuthenticated(), CanViewDocuments()]

    @extend_schema(tags=["Documents"])
    def get(self, request, item_id):
        item = get_library_item_or_404(request.company, item_id)
        root_id = item.root_item_id
        family = LibraryItem.objects.filter(
            company=request.company,
            is_deleted=False,
        ).filter(Q(id=root_id) | Q(parent_item_id=root_id)).order_by("-version_number", "-created_at")
        return _success({"versions": LibraryItemVersionSerializer(family, many=True).data})

    @extend_schema(request=LibraryVersionCreateSerializer, tags=["Documents"])
    def post(self, request, item_id):
        item = get_library_item_or_404(request.company, item_id)
        serializer = LibraryVersionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = create_new_version(item, request.user, serializer.validated_data)
        return _success({"item": LibraryItemSerializer(version).data}, status.HTTP_201_CREATED)

