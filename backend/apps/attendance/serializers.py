"""Attendance serializers."""

from rest_framework import serializers

from apps.attendance.models import (
    AttendanceDayStatus,
    AttendanceEventType,
    AttendanceMethod,
    CheckInPoint,
    ProjectWorkerAssignment,
    WorkerTrade,
)


class WorkerAssignmentSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)
    worker_email = serializers.EmailField(source="worker.email", read_only=True)

    class Meta:
        model = ProjectWorkerAssignment
        fields = [
            "id",
            "worker",
            "worker_name",
            "worker_email",
            "trade",
            "employee_code",
            "shift_start_time",
            "shift_end_time",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class WorkerAssignmentCreateSerializer(serializers.Serializer):
    worker_id = serializers.UUIDField()
    trade = serializers.ChoiceField(choices=WorkerTrade.choices, required=False)
    employee_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    shift_start_time = serializers.TimeField(required=False)
    shift_end_time = serializers.TimeField(required=False)


class CheckInPointSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="site.name", read_only=True)

    class Meta:
        model = CheckInPoint
        fields = ["id", "site", "site_name", "name", "code", "description", "is_active", "created_at"]
        read_only_fields = ["id", "code", "created_at"]


class CheckInPointCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)


class AttendanceClockSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    event_type = serializers.ChoiceField(choices=AttendanceEventType.choices)
    check_in_point_code = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    client_event_id = serializers.CharField(required=False, allow_blank=True)
    is_offline_sync = serializers.BooleanField(required=False, default=False)
    event_at = serializers.DateTimeField(required=False, allow_null=True)


class AttendanceQRScanSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    check_in_point_code = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    client_event_id = serializers.CharField(required=False, allow_blank=True)
    is_offline_sync = serializers.BooleanField(required=False, default=False)
    event_at = serializers.DateTimeField(required=False, allow_null=True)


class AttendanceManualMarkSerializer(serializers.Serializer):
    worker_id = serializers.UUIDField()
    work_date = serializers.DateField()
    status = serializers.ChoiceField(
        choices=[
            AttendanceDayStatus.PRESENT,
            AttendanceDayStatus.ABSENT,
            AttendanceDayStatus.LATE,
        ]
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class AttendanceEventSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    worker_id = serializers.UUIDField()
    worker_name = serializers.CharField()
    event_type = serializers.CharField()
    event_at = serializers.DateTimeField()
    method = serializers.CharField()
    location = serializers.CharField(allow_null=True)
    is_late = serializers.BooleanField()
