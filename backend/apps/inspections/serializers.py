"""Inspection API serializers."""

from rest_framework import serializers

from apps.inspections.models import Inspection, InspectionResult, InspectionStatus, InspectionType


class InspectionListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    inspector_name = serializers.CharField(source="inspector.full_name", read_only=True, default=None)
    open_findings_count = serializers.IntegerField(read_only=True)
    failed_checklist_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Inspection
        fields = [
            "id",
            "inspection_number",
            "title",
            "inspection_type",
            "area_location",
            "status",
            "result",
            "score_percent",
            "scheduled_date",
            "inspected_at",
            "submitted_at",
            "reviewed_at",
            "project",
            "project_name",
            "inspector",
            "inspector_name",
            "open_findings_count",
            "failed_checklist_count",
            "created_at",
        ]

class InspectionSerializer(InspectionListSerializer):
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default=None)

    class Meta(InspectionListSerializer.Meta):
        fields = InspectionListSerializer.Meta.fields + [
            "description",
            "checklist_items",
            "findings",
            "photos",
            "reviewed_by",
            "reviewed_by_name",
            "created_by",
            "created_by_name",
            "updated_at",
        ]


class InspectionCreateUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    inspection_type = serializers.ChoiceField(choices=InspectionType.choices, required=False)
    area_location = serializers.CharField(required=False, allow_blank=True, default="")
    scheduled_date = serializers.DateField(required=False, allow_null=True)
    inspector_id = serializers.UUIDField(required=False, allow_null=True)
    use_template = serializers.BooleanField(required=False, default=True)
    checklist_items = serializers.ListField(child=serializers.DictField(), required=False)
    findings = serializers.ListField(child=serializers.DictField(), required=False)
    photos = serializers.ListField(child=serializers.DictField(), required=False)


class InspectionReviewSerializer(serializers.Serializer):
    result = serializers.ChoiceField(choices=InspectionResult.choices)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
