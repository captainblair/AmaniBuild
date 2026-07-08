"""Scheduling API serializers."""

from rest_framework import serializers

from apps.scheduling.models import DependencyType, ScheduleItemStatus


class SchedulePhaseSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    color = serializers.CharField(max_length=16, required=False, default="#F97316")
    sort_order = serializers.IntegerField(required=False, default=0)


class ScheduleItemCreateUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    phase_id = serializers.UUIDField(required=False, allow_null=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    progress_percent = serializers.IntegerField(required=False, min_value=0, max_value=100, default=0)
    status = serializers.ChoiceField(choices=ScheduleItemStatus.choices, required=False)
    color = serializers.CharField(required=False, allow_blank=True, default="")
    sort_order = serializers.IntegerField(required=False, default=0)
    is_milestone = serializers.BooleanField(required=False, default=False)
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    linked_task_id = serializers.UUIDField(required=False, allow_null=True)


class ScheduleDependencySerializer(serializers.Serializer):
    predecessor_id = serializers.UUIDField()
    successor_id = serializers.UUIDField()
    dependency_type = serializers.ChoiceField(choices=DependencyType.choices, required=False)
    lag_days = serializers.IntegerField(required=False, default=0)
