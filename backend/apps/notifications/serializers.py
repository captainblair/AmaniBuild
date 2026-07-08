"""Notification serializers."""

from rest_framework import serializers

from apps.notifications.models import ActivityEvent, Notification


class NotificationActorSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class NotificationListSerializer(serializers.ModelSerializer):
    actor = NotificationActorSerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)

    class Meta:
        model = Notification
        fields = [
            "id",
            "category",
            "priority",
            "title",
            "body",
            "is_read",
            "read_at",
            "action_label",
            "action_url",
            "project",
            "project_name",
            "actor",
            "source_type",
            "source_id",
            "metadata",
            "created_at",
        ]


class NotificationSerializer(NotificationListSerializer):
    class Meta(NotificationListSerializer.Meta):
        fields = NotificationListSerializer.Meta.fields


class ActivityEventSerializer(serializers.ModelSerializer):
    actor = NotificationActorSerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)

    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "event_type",
            "title",
            "summary",
            "occurred_at",
            "project",
            "project_name",
            "actor",
            "source_type",
            "source_id",
            "metadata",
        ]


class ActivityTimelineItemSerializer(serializers.Serializer):
    occurred_at = serializers.DateTimeField()
    event_type = serializers.CharField()
    title = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)
    actor_name = serializers.CharField(allow_null=True)
    project_id = serializers.CharField(allow_null=True)
    project_name = serializers.CharField(allow_null=True)
    source_type = serializers.CharField(allow_blank=True)
    source_id = serializers.CharField(allow_null=True)
    metadata = serializers.DictField()
