"""Team messaging API views."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanManageMessaging, CanViewMessaging
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.messaging.models import ChatMessage, ConversationType
from apps.messaging.serializers import (
    ChatMessageCreateSerializer,
    ChatMessageSerializer,
    ConversationCreateSerializer,
    ConversationListSerializer,
    ConversationSerializer,
    ConversationUpdateSerializer,
)
from apps.messaging.services import (
    apply_conversation_filters,
    assert_channel_member,
    create_team_channel,
    get_channel_last_message_at,
    get_channel_or_404,
    get_channel_unread_count,
    get_conversation_summary,
    get_mentions_for_user,
    get_or_create_project_channel,
    get_project_for_company,
    get_shared_files,
    get_user_channels,
    mark_channel_read,
    send_message,
    update_channel,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _serialize_channel(channel, user):
    data = ConversationListSerializer(channel).data
    data["unread_count"] = get_channel_unread_count(channel, user)
    data["last_message_at"] = get_channel_last_message_at(channel)
    if data["last_message_at"]:
        data["last_message_at"] = data["last_message_at"].isoformat()
    return data


class ConversationListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageMessaging()]
        return [IsAuthenticated(), CanViewMessaging()]

    @extend_schema(tags=["Messaging"])
    def get(self, request):
        queryset = apply_conversation_filters(get_user_channels(request.company, request.user), request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at"), request)
        results = [_serialize_channel(channel, request.user) for channel in page]
        response = paginator.get_paginated_response(results)
        response.data["summary"] = get_conversation_summary(request.company, request.user)
        return response

    @extend_schema(request=ConversationCreateSerializer, tags=["Messaging"])
    def post(self, request):
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        channel = create_team_channel(request.company, request.user, serializer.validated_data)
        return _success({"conversation": ConversationSerializer(channel).data}, status.HTTP_201_CREATED)


class ConversationSummaryView(APIView):
    permission_classes = [IsAuthenticated, CanViewMessaging]

    @extend_schema(tags=["Messaging"])
    def get(self, request):
        return _success({"summary": get_conversation_summary(request.company, request.user)})


class ConversationMentionsView(APIView):
    permission_classes = [IsAuthenticated, CanViewMessaging]

    @extend_schema(tags=["Messaging"])
    def get(self, request):
        limit = int(request.query_params.get("limit", 20))
        return _success({"mentions": get_mentions_for_user(request.company, request.user, limit=limit)})


class ConversationDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewMessaging()]
        return [IsAuthenticated(), CanManageMessaging()]

    @extend_schema(tags=["Messaging"])
    def get(self, request, channel_id):
        channel = get_channel_or_404(request.company, channel_id)
        assert_channel_member(channel, request.user)
        payload = ConversationSerializer(channel).data
        payload["unread_count"] = get_channel_unread_count(channel, request.user)
        return _success({"conversation": payload})

    @extend_schema(request=ConversationUpdateSerializer, tags=["Messaging"])
    def patch(self, request, channel_id):
        channel = get_channel_or_404(request.company, channel_id)
        assert_channel_member(channel, request.user)
        serializer = ConversationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        channel = update_channel(channel, serializer.validated_data)
        return _success({"conversation": ConversationSerializer(channel).data})


class ConversationMessageListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        return [IsAuthenticated(), CanViewMessaging()]

    @extend_schema(tags=["Messaging"])
    def get(self, request, channel_id):
        channel = get_channel_or_404(request.company, channel_id)
        assert_channel_member(channel, request.user)
        queryset = ChatMessage.objects.filter(channel=channel, is_deleted=False).select_related("author", "reply_to")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("-created_at"), request)
        return paginator.get_paginated_response(ChatMessageSerializer(page, many=True).data)

    @extend_schema(request=ChatMessageCreateSerializer, tags=["Messaging"])
    def post(self, request, channel_id):
        channel = get_channel_or_404(request.company, channel_id)
        serializer = ChatMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_announcement") and channel.channel_type != ConversationType.TEAM:
            raise AmaniBuildAPIException(
                "Announcements can only be posted in team conversations.",
                code="validation_error",
            )
        message = send_message(channel, request.user, serializer.validated_data)
        return _success({"message": ChatMessageSerializer(message).data}, status.HTTP_201_CREATED)


class ConversationReadView(APIView):
    permission_classes = [IsAuthenticated, CanViewMessaging]

    @extend_schema(tags=["Messaging"])
    def post(self, request, channel_id):
        channel = get_channel_or_404(request.company, channel_id)
        membership = mark_channel_read(channel, request.user)
        return _success(
            {
                "channel_id": str(channel.id),
                "last_read_at": membership.last_read_at.isoformat() if membership.last_read_at else None,
            }
        )


class ConversationFilesView(APIView):
    permission_classes = [IsAuthenticated, CanViewMessaging]

    @extend_schema(tags=["Messaging"])
    def get(self, request, channel_id):
        channel = get_channel_or_404(request.company, channel_id)
        assert_channel_member(channel, request.user)
        return _success({"files": get_shared_files(channel)})


class ProjectConversationView(APIView):
    permission_classes = [IsAuthenticated, CanViewMessaging]

    @extend_schema(tags=["Messaging"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        channel = get_or_create_project_channel(request.company, project, request.user)
        payload = ConversationSerializer(channel).data
        payload["unread_count"] = get_channel_unread_count(channel, request.user)
        return _success({"conversation": payload})

    @extend_schema(tags=["Messaging"])
    def post(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        channel = get_or_create_project_channel(request.company, project, request.user)
        payload = ConversationSerializer(channel).data
        payload["unread_count"] = get_channel_unread_count(channel, request.user)
        return _success({"conversation": payload}, status.HTTP_201_CREATED)
