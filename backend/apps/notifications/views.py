"""Notifications center API views."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanViewNotifications
from apps.core.pagination import StandardResultsPagination
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationListSerializer, NotificationSerializer
from apps.notifications.services import (
    apply_notification_filters,
    get_activity_timeline,
    get_notification_or_404,
    get_notification_summary,
    mark_all_notifications_read,
    mark_notification_read,
    sync_actionable_notifications,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _notification_queryset(company, user):
    return Notification.objects.filter(
        company=company,
        recipient=user,
        is_deleted=False,
    ).select_related("project", "actor")


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated, CanViewNotifications]
    pagination_class = StandardResultsPagination

    @extend_schema(tags=["Notifications"])
    def get(self, request):
        sync_actionable_notifications(request.user, request.company)
        queryset = apply_notification_filters(_notification_queryset(request.company, request.user), request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at"), request)
        response = paginator.get_paginated_response(NotificationListSerializer(page, many=True).data)
        response.data["summary"] = get_notification_summary(request.user, request.company)
        return response


class NotificationSummaryView(APIView):
    permission_classes = [IsAuthenticated, CanViewNotifications]

    @extend_schema(tags=["Notifications"])
    def get(self, request):
        sync_actionable_notifications(request.user, request.company)
        return _success({"summary": get_notification_summary(request.user, request.company)})


class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated, CanViewNotifications]

    @extend_schema(tags=["Notifications"])
    def get(self, request, notification_id):
        notification = get_notification_or_404(request.company, request.user, notification_id)
        return _success({"notification": NotificationSerializer(notification).data})


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated, CanViewNotifications]

    @extend_schema(tags=["Notifications"])
    def post(self, request, notification_id):
        notification = get_notification_or_404(request.company, request.user, notification_id)
        notification = mark_notification_read(notification)
        return _success({"notification": NotificationSerializer(notification).data})


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated, CanViewNotifications]

    @extend_schema(tags=["Notifications"])
    def post(self, request):
        updated = mark_all_notifications_read(request.user, request.company)
        return _success({"updated_count": updated, "summary": get_notification_summary(request.user, request.company)})


class ActivityTimelineView(APIView):
    permission_classes = [IsAuthenticated, CanViewNotifications]

    @extend_schema(tags=["Notifications"])
    def get(self, request):
        project_id = request.query_params.get("project_id")
        limit = int(request.query_params.get("limit", 50))
        timeline = get_activity_timeline(request.company, project_id=project_id, limit=limit)
        return _success({"timeline": timeline})
