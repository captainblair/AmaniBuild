"""Site diary serializers."""

from rest_framework import serializers

from apps.diary.models import DiaryEntryStatus, SiteDiaryEntry, WeatherCondition


class DiaryUserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class SiteDiaryEntrySerializer(serializers.ModelSerializer):
    supervisor = DiaryUserSummarySerializer(read_only=True)
    action_owner = DiaryUserSummarySerializer(read_only=True)
    approved_by = DiaryUserSummarySerializer(read_only=True)
    created_by = DiaryUserSummarySerializer(read_only=True)
    has_issues = serializers.BooleanField(read_only=True)
    photo_count = serializers.IntegerField(read_only=True)
    materials_count = serializers.IntegerField(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = SiteDiaryEntry
        fields = [
            "id",
            "project",
            "project_name",
            "entry_date",
            "status",
            "weather_condition",
            "weather_temperature_c",
            "weather_humidity_percent",
            "weather_wind",
            "supervisor",
            "workforce_count",
            "working_hours",
            "work_description",
            "progress_percent",
            "milestones",
            "labour_activities",
            "equipment_used",
            "materials_consumed",
            "delays",
            "safety_concerns",
            "required_actions",
            "action_owner",
            "site_conditions_notes",
            "photos",
            "has_issues",
            "photo_count",
            "materials_count",
            "submitted_at",
            "approved_at",
            "approved_by",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "project",
            "status",
            "submitted_at",
            "approved_at",
            "approved_by",
            "created_by",
            "created_at",
            "updated_at",
        ]


class SiteDiaryEntryListSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source="supervisor.full_name", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default=None)
    has_issues = serializers.BooleanField(read_only=True)
    photo_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SiteDiaryEntry
        fields = [
            "id",
            "entry_date",
            "status",
            "weather_condition",
            "weather_temperature_c",
            "progress_percent",
            "workforce_count",
            "supervisor_name",
            "created_by_name",
            "has_issues",
            "photo_count",
            "materials_count",
            "created_at",
        ]


class SiteDiaryEntryCreateUpdateSerializer(serializers.Serializer):
    entry_date = serializers.DateField()
    weather_condition = serializers.ChoiceField(choices=WeatherCondition.choices, required=False)
    weather_temperature_c = serializers.DecimalField(
        max_digits=4,
        decimal_places=1,
        required=False,
        allow_null=True,
    )
    weather_humidity_percent = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)
    weather_wind = serializers.CharField(max_length=100, required=False, allow_blank=True)
    supervisor_id = serializers.UUIDField(required=False, allow_null=True)
    workforce_count = serializers.IntegerField(required=False, min_value=0)
    working_hours = serializers.DecimalField(max_digits=4, decimal_places=1, required=False)
    work_description = serializers.CharField(required=False, allow_blank=True)
    progress_percent = serializers.IntegerField(required=False, min_value=0, max_value=100)
    milestones = serializers.ListField(child=serializers.DictField(), required=False)
    labour_activities = serializers.ListField(child=serializers.CharField(), required=False)
    equipment_used = serializers.ListField(child=serializers.CharField(), required=False)
    materials_consumed = serializers.ListField(child=serializers.DictField(), required=False)
    delays = serializers.CharField(required=False, allow_blank=True)
    safety_concerns = serializers.CharField(required=False, allow_blank=True)
    required_actions = serializers.CharField(required=False, allow_blank=True)
    action_owner_id = serializers.UUIDField(required=False, allow_null=True)
    site_conditions_notes = serializers.CharField(required=False, allow_blank=True)
    photos = serializers.ListField(child=serializers.DictField(), required=False)
