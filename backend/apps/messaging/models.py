"""Team communication and project messaging models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class ConversationType(models.TextChoices):
    PROJECT = "project", "Project Channel"
    TEAM = "team", "Team Conversation"


class ConversationChannel(TenantScopedModel):
    """Project or team chat channel."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="conversation_channels",
    )
    project = models.OneToOneField(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="conversation_channel",
    )
    channel_type = models.CharField(max_length=16, choices=ConversationType.choices)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    pinned_announcement = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_conversation_channels",
    )
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "channel_type"]),
            models.Index(fields=["company", "is_archived"]),
        ]

    def __str__(self):
        return self.name


class ConversationMember(TenantScopedModel):
    """Membership and read state for a channel."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="conversation_memberships",
    )
    channel = models.ForeignKey(
        ConversationChannel,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_memberships",
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)

    class Meta:
        unique_together = [("channel", "user")]
        indexes = [
            models.Index(fields=["user", "channel"]),
            models.Index(fields=["company", "user"]),
        ]

    def __str__(self):
        return f"{self.user_id} in {self.channel.name}"


class ChatMessage(TenantScopedModel):
    """Message posted in a conversation channel."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    channel = models.ForeignKey(
        ConversationChannel,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="chat_messages",
    )
    body = models.TextField()
    attachments = models.JSONField(default=list, blank=True)
    mention_user_ids = models.JSONField(default=list, blank=True)
    reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
    )
    is_pinned = models.BooleanField(default=False)
    is_announcement = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["channel", "created_at"]),
            models.Index(fields=["company", "created_at"]),
        ]

    def __str__(self):
        return f"{self.author_id}: {self.body[:40]}"
