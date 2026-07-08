"""Team messaging business logic."""

from django.contrib.auth import get_user_model
from django.db.models import Max, Q
from django.utils import timezone

from apps.companies.models import Company, CompanyMembership
from apps.core.exceptions import AmaniBuildAPIException
from apps.messaging.models import ChatMessage, ConversationChannel, ConversationMember, ConversationType
from apps.notifications.models import NotificationCategory, NotificationPriority
from apps.notifications.services import create_notification
from apps.projects.models import Project

User = get_user_model()


def get_project_for_company(company: Company, project_id) -> Project:
    project = Project.objects.filter(company=company, id=project_id, is_deleted=False).first()
    if not project:
        raise AmaniBuildAPIException("Project not found.", code="not_found")
    return project


def get_channel_or_404(company: Company, channel_id) -> ConversationChannel:
    channel = (
        ConversationChannel.objects.filter(company=company, id=channel_id, is_deleted=False)
        .select_related("project", "created_by")
        .first()
    )
    if not channel:
        raise AmaniBuildAPIException("Conversation not found.", code="not_found")
    return channel


def assert_channel_member(channel: ConversationChannel, user) -> ConversationMember:
    membership = ConversationMember.objects.filter(
        channel=channel,
        user=user,
        is_deleted=False,
    ).first()
    if not membership:
        raise AmaniBuildAPIException("You are not a member of this conversation.", code="forbidden")
    return membership


def _active_company_member_ids(company: Company) -> set:
    member_ids = set(
        CompanyMembership.objects.filter(
            company=company,
            is_active=True,
            is_deleted=False,
        ).values_list("user_id", flat=True)
    )
    member_ids.add(company.owner_id)
    return member_ids


def _add_member(channel: ConversationChannel, user) -> ConversationMember:
    membership, _ = ConversationMember.objects.get_or_create(
        company=channel.company,
        channel=channel,
        user=user,
        defaults={"last_read_at": timezone.now()},
    )
    if membership.is_deleted:
        membership.is_deleted = False
        membership.deleted_at = None
        membership.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
    return membership


def _add_all_company_members(channel: ConversationChannel) -> None:
    member_ids = _active_company_member_ids(channel.company)
    for user_id in member_ids:
        _add_member(channel, User.objects.get(id=user_id))


def get_or_create_project_channel(company: Company, project: Project, creator) -> ConversationChannel:
    channel = ConversationChannel.objects.filter(
        company=company,
        project=project,
        is_deleted=False,
    ).first()
    if channel:
        _add_member(channel, creator)
        return channel

    channel = ConversationChannel.objects.create(
        company=company,
        project=project,
        channel_type=ConversationType.PROJECT,
        name=project.name,
        description=f"Project channel for {project.name}",
        created_by=creator,
    )
    _add_all_company_members(channel)
    return channel


def create_team_channel(company: Company, creator, data: dict) -> ConversationChannel:
    channel = ConversationChannel.objects.create(
        company=company,
        channel_type=ConversationType.TEAM,
        name=data["name"],
        description=data.get("description", ""),
        pinned_announcement=data.get("pinned_announcement", ""),
        created_by=creator,
    )
    member_ids = data.get("member_ids") or []
    valid_ids = _active_company_member_ids(company)
    _add_member(channel, creator)
    for user_id in member_ids:
        if user_id in valid_ids and user_id != creator.id:
            _add_member(channel, User.objects.get(id=user_id))
    return channel


def apply_conversation_filters(queryset, request):
    channel_type = request.query_params.get("channel_type")
    if channel_type:
        queryset = queryset.filter(channel_type=channel_type)

    project_id = request.query_params.get("project_id")
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))

    if request.query_params.get("include_archived", "false").lower() not in {"true", "1", "yes"}:
        queryset = queryset.filter(is_archived=False)

    return queryset


def get_user_channels(company: Company, user):
    return ConversationChannel.objects.filter(
        company=company,
        is_deleted=False,
        memberships__user=user,
        memberships__is_deleted=False,
    ).select_related("project", "created_by").distinct()


def get_conversation_summary(company: Company, user) -> dict:
    memberships = ConversationMember.objects.filter(
        company=company,
        user=user,
        is_deleted=False,
        channel__is_deleted=False,
        channel__is_archived=False,
    ).select_related("channel")

    unread_total = 0
    channels = []
    for membership in memberships:
        unread_qs = ChatMessage.objects.filter(
            channel=membership.channel,
            is_deleted=False,
        )
        if membership.last_read_at:
            unread_qs = unread_qs.filter(created_at__gt=membership.last_read_at)
        unread_count = unread_qs.count()
        unread_total += unread_count
        channels.append(
            {
                "channel_id": str(membership.channel_id),
                "unread_count": unread_count,
            }
        )

    return {
        "unread_total": unread_total,
        "channels": channels,
        "mentions": get_mentions_for_user(company, user, limit=5),
    }


def get_channel_unread_count(channel: ConversationChannel, user) -> int:
    membership = ConversationMember.objects.filter(channel=channel, user=user, is_deleted=False).first()
    if not membership:
        return 0
    queryset = ChatMessage.objects.filter(channel=channel, is_deleted=False)
    if membership.last_read_at:
        queryset = queryset.filter(created_at__gt=membership.last_read_at)
    return queryset.count()


def mark_channel_read(channel: ConversationChannel, user) -> ConversationMember:
    membership = assert_channel_member(channel, user)
    membership.last_read_at = timezone.now()
    membership.save(update_fields=["last_read_at", "updated_at"])
    return membership


def _notify_mentions(channel: ConversationChannel, author, body: str, mention_user_ids: list) -> None:
    valid_ids = {str(user_id) for user_id in _active_company_member_ids(channel.company)}
    for user_id in mention_user_ids:
        user_id_str = str(user_id)
        if user_id_str == str(author.id) or user_id_str not in valid_ids:
            continue
        recipient = User.objects.filter(id=user_id).first()
        if not recipient:
            continue
        create_notification(
            company=channel.company,
            recipient=recipient,
            actor=author,
            project=channel.project,
            category=NotificationCategory.MENTION,
            priority=NotificationPriority.MEDIUM,
            title=f"{author.full_name} mentioned you in {channel.name}",
            body=body[:280],
            action_label="Open Conversation",
            action_url=f"/messages/{channel.id}",
            source_type="conversation_channel",
            source_id=channel.id,
            metadata={"channel_name": channel.name},
        )


def send_message(channel: ConversationChannel, author, data: dict) -> ChatMessage:
    assert_channel_member(channel, author)
    reply_to = None
    if data.get("reply_to_id"):
        reply_to = ChatMessage.objects.filter(
            channel=channel,
            id=data["reply_to_id"],
            is_deleted=False,
        ).first()
        if not reply_to:
            raise AmaniBuildAPIException("Reply message not found.", code="not_found")

    mention_user_ids = [str(user_id) for user_id in data.get("mention_user_ids", [])]
    message = ChatMessage.objects.create(
        company=channel.company,
        channel=channel,
        author=author,
        body=data["body"],
        attachments=data.get("attachments", []),
        mention_user_ids=mention_user_ids,
        reply_to=reply_to,
        is_pinned=data.get("is_pinned", False),
        is_announcement=data.get("is_announcement", False),
    )

    if data.get("is_announcement"):
        channel.pinned_announcement = data["body"]
        channel.save(update_fields=["pinned_announcement", "updated_at"])

    if mention_user_ids:
        _notify_mentions(channel, author, data["body"], mention_user_ids)

    return message


def update_channel(channel: ConversationChannel, data: dict) -> ConversationChannel:
    if "name" in data:
        channel.name = data["name"]
    if "description" in data:
        channel.description = data["description"]
    if "pinned_announcement" in data:
        channel.pinned_announcement = data["pinned_announcement"]
    if "is_archived" in data:
        channel.is_archived = data["is_archived"]
    channel.save()
    return channel


def get_shared_files(channel: ConversationChannel) -> list[dict]:
    files = []
    for message in ChatMessage.objects.filter(channel=channel, is_deleted=False).order_by("-created_at"):
        for attachment in message.attachments or []:
            files.append(
                {
                    "message_id": str(message.id),
                    "uploaded_by": message.author.full_name if message.author else None,
                    "uploaded_at": message.created_at.isoformat(),
                    **attachment,
                }
            )
    return files


def get_mentions_for_user(company: Company, user, limit: int = 20) -> list[dict]:
    from apps.notifications.models import Notification

    mentions = (
        Notification.objects.filter(
            company=company,
            recipient=user,
            category=NotificationCategory.MENTION,
            source_type="conversation_channel",
            is_deleted=False,
        )
        .select_related("actor", "project")
        .order_by("-created_at")[:limit]
    )
    return [
        {
            "id": str(mention.id),
            "title": mention.title,
            "body": mention.body,
            "actor_name": mention.actor.full_name if mention.actor else None,
            "channel_id": str(mention.source_id) if mention.source_id else None,
            "project_name": mention.project.name if mention.project else None,
            "is_read": mention.is_read,
            "created_at": mention.created_at.isoformat(),
        }
        for mention in mentions
    ]


def get_channel_last_message_at(channel: ConversationChannel):
    return ChatMessage.objects.filter(channel=channel, is_deleted=False).aggregate(
        last_message_at=Max("created_at")
    )["last_message_at"]
