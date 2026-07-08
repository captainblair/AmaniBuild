"""Reports serializers."""

from rest_framework import serializers

from apps.reports.models import GeneratedReport, ReportType


class GeneratedBySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class GeneratedReportSerializer(serializers.ModelSerializer):
    generated_by = GeneratedBySerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)

    class Meta:
        model = GeneratedReport
        fields = [
            "id",
            "report_type",
            "title",
            "project",
            "project_name",
            "generated_by",
            "date_from",
            "date_to",
            "output_format",
            "status",
            "payload",
            "created_at",
        ]


class ReportGenerateSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(choices=ReportType.choices)
    title = serializers.CharField(max_length=255, required=False)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    date_from = serializers.DateField(required=False, allow_null=True)
    date_to = serializers.DateField(required=False, allow_null=True)
    output_format = serializers.CharField(max_length=16, required=False)

