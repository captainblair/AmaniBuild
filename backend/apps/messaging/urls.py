"""Messaging URL routes."""

from django.urls import path

from apps.messaging.views import (
    ConversationDetailView,
    ConversationFilesView,
    ConversationListCreateView,
    ConversationMentionsView,
    ConversationMessageListCreateView,
    ConversationReadView,
    ConversationSummaryView,
    ProjectConversationView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list"),
    path("conversations/summary/", ConversationSummaryView.as_view(), name="conversation-summary"),
    path("conversations/mentions/", ConversationMentionsView.as_view(), name="conversation-mentions"),
    path("conversations/<uuid:channel_id>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path(
        "conversations/<uuid:channel_id>/messages/",
        ConversationMessageListCreateView.as_view(),
        name="conversation-messages",
    ),
    path(
        "conversations/<uuid:channel_id>/read/",
        ConversationReadView.as_view(),
        name="conversation-read",
    ),
    path(
        "conversations/<uuid:channel_id>/files/",
        ConversationFilesView.as_view(),
        name="conversation-files",
    ),
    path(
        "projects/<uuid:project_id>/conversation/",
        ProjectConversationView.as_view(),
        name="project-conversation",
    ),
]
