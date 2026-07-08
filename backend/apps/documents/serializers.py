"""Documents and photos serializers."""

from django.db.models import Q
from rest_framework import serializers

from apps.documents.models import LibraryAssetType, LibraryDocumentType, LibraryItem


class LibraryUserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class LibraryItemListSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True, default=None)
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    version = serializers.SerializerMethodField()

    class Meta:
        model = LibraryItem
        fields = [
            "id",
            "title",
            "asset_type",
            "document_type",
            "folder_path",
            "file_extension",
            "size_bytes",
            "uploaded_by_name",
            "project",
            "project_name",
            "captured_at",
            "is_archived",
            "version",
            "created_at",
        ]

    def get_version(self, obj) -> str:
        return f"v{obj.version_number}"


class LibraryItemVersionSerializer(serializers.ModelSerializer):
    uploaded_by = LibraryUserSummarySerializer(read_only=True)
    version = serializers.SerializerMethodField()

    class Meta:
        model = LibraryItem
        fields = [
            "id",
            "version",
            "title",
            "file_url",
            "file_extension",
            "size_bytes",
            "uploaded_by",
            "created_at",
            "is_current_version",
        ]

    def get_version(self, obj) -> str:
        return f"v{obj.version_number}"


class LibraryItemSerializer(serializers.ModelSerializer):
    uploaded_by = LibraryUserSummarySerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    versions = serializers.SerializerMethodField()

    class Meta:
        model = LibraryItem
        fields = [
            "id",
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
            "project",
            "project_name",
            "uploaded_by",
            "captured_at",
            "is_archived",
            "version_number",
            "is_current_version",
            "versions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_by",
            "version_number",
            "is_current_version",
            "versions",
            "created_at",
            "updated_at",
        ]

    def get_versions(self, obj):
        family = LibraryItem.objects.filter(
            company=obj.company,
            is_deleted=False,
        ).filter(Q(id=obj.root_item_id) | Q(parent_item_id=obj.root_item_id)).order_by(
            "-version_number",
            "-created_at",
        )
        return LibraryItemVersionSerializer(family, many=True).data


class LibraryItemCreateUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    asset_type = serializers.ChoiceField(choices=LibraryAssetType.choices, required=False)
    document_type = serializers.ChoiceField(choices=LibraryDocumentType.choices, required=False)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    folder_path = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file_url = serializers.URLField(required=False, allow_blank=True)
    file_extension = serializers.CharField(max_length=20, required=False, allow_blank=True)
    mime_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    size_bytes = serializers.IntegerField(required=False, min_value=0)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    metadata = serializers.DictField(required=False)
    captured_at = serializers.DateTimeField(required=False, allow_null=True)
    is_archived = serializers.BooleanField(required=False)


class LibraryVersionCreateSerializer(serializers.Serializer):
    file_url = serializers.URLField(required=False, allow_blank=True)
    file_extension = serializers.CharField(max_length=20, required=False, allow_blank=True)
    mime_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    size_bytes = serializers.IntegerField(required=False, min_value=0)
    metadata = serializers.DictField(required=False)

