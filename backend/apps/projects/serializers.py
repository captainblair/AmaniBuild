"""Project serializers."""

from rest_framework import serializers

from apps.projects.models import Project, ProjectStatus, ProjectType


class ProjectSiteSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    city = serializers.CharField()
    county = serializers.CharField()


class ProjectManagerSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class ProjectSerializer(serializers.ModelSerializer):
    site = ProjectSiteSummarySerializer(read_only=True)
    project_manager = ProjectManagerSummarySerializer(read_only=True)
    budget_remaining = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    budget_utilization_percent = serializers.FloatField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "slug",
            "code",
            "project_type",
            "status",
            "description",
            "client_name",
            "client_email",
            "client_phone",
            "budget_total",
            "budget_spent",
            "budget_remaining",
            "budget_utilization_percent",
            "currency",
            "planned_start_date",
            "planned_end_date",
            "actual_start_date",
            "actual_end_date",
            "progress_percent",
            "site",
            "project_manager",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class ProjectListSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="site.name", read_only=True, default=None)
    site_city = serializers.CharField(source="site.city", read_only=True, default=None)
    project_manager_name = serializers.CharField(
        source="project_manager.full_name",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "slug",
            "code",
            "project_type",
            "status",
            "budget_total",
            "budget_spent",
            "currency",
            "planned_start_date",
            "planned_end_date",
            "progress_percent",
            "site_name",
            "site_city",
            "project_manager_name",
            "created_at",
        ]


class ProjectCreateUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    project_type = serializers.ChoiceField(choices=ProjectType.choices, required=False)
    status = serializers.ChoiceField(choices=ProjectStatus.choices, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    client_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    client_email = serializers.EmailField(required=False, allow_blank=True)
    client_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    budget_total = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    budget_spent = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    currency = serializers.CharField(max_length=3, required=False, default="KES")
    planned_start_date = serializers.DateField(required=False, allow_null=True)
    planned_end_date = serializers.DateField(required=False, allow_null=True)
    actual_start_date = serializers.DateField(required=False, allow_null=True)
    actual_end_date = serializers.DateField(required=False, allow_null=True)
    progress_percent = serializers.IntegerField(required=False, min_value=0, max_value=100)
    site_id = serializers.UUIDField(required=False, allow_null=True)
    project_manager_id = serializers.UUIDField(required=False, allow_null=True)


class ProjectOverviewSerializer(serializers.Serializer):
    project = ProjectSerializer()
    summary = serializers.DictField()
