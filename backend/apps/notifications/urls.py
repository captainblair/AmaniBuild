"""Notifications URL routes."""

from django.urls import path

from apps.notifications.views import (
    ActivityTimelineView,
    NotificationDetailView,
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
    NotificationSummaryView,
)

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/summary/", NotificationSummaryView.as_view(), name="notification-summary"),
    path("notifications/read-all/", NotificationReadAllView.as_view(), name="notification-read-all"),
    path("notifications/<uuid:notification_id>/", NotificationDetailView.as_view(), name="notification-detail"),
    path(
        "notifications/<uuid:notification_id>/read/",
        NotificationReadView.as_view(),
        name="notification-read",
    ),
    path("activity/", ActivityTimelineView.as_view(), name="activity-timeline"),
]
