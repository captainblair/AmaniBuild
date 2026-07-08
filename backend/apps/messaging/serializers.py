"""Messaging serializers."""

from rest_framework import serializers

from apps.messaging.models import ChatMessage, ConversationChannel, ConversationType


class MessagingUserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class ConversationListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    unread_count = serializers.IntegerField(read_only=True, default=0)
    last_message_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = ConversationChannel
        fields = [
            "id",
            "name",
            "description",
            "channel_type",
            "project",
            "project_name",
            "pinned_announcement",
            "is_archived",
            "unread_count",
            "last_message_at",
            "created_at",
        ]


class ConversationSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    created_by = MessagingUserSummarySerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ConversationChannel
        fields = [
            "id",
            "name",
            "description",
            "channel_type",
            "project",
            "project_name",
            "pinned_announcement",
            "is_archived",
            "created_by",
            "member_count",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_member_count(self, obj) -> int:
        return obj.memberships.filter(is_deleted=False).count()


class ConversationCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    pinned_announcement = serializers.CharField(required=False, allow_blank=True)
    member_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class ConversationUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    pinned_announcement = serializers.CharField(required=False, allow_blank=True)
    is_archived = serializers.BooleanField(required=False)


class ChatMessageSerializer(serializers.ModelSerializer):
    author = MessagingUserSummarySerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "body",
            "attachments",
            "mention_user_ids",
            "reply_to_id",
            "is_pinned",
            "is_announcement",
            "author",
            "created_at",
        ]


class ChatMessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField()
    attachments = serializers.ListField(child=serializers.DictField(), required=False)
    mention_user_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    reply_to_id = serializers.UUIDField(required=False, allow_null=True)
    is_pinned = serializers.BooleanField(required=False)
    is_announcement = serializers.BooleanField(required=False)
