"""Notifications and activity feed business logic."""

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone

from apps.attendance.models import AttendanceEvent
from apps.companies.models import Company
from apps.companies.rbac import APPROVE_PROCUREMENT, MANAGE_INVENTORY, role_has_permission
from apps.companies.services import get_user_company_role
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.models import DiaryEntryStatus, SiteDiaryEntry
from apps.documents.models import LibraryItem
from apps.inventory.models import InventoryItem, StockMovement, StockStatus
from apps.notifications.models import (
    ActivityEvent,
    ActivityEventType,
    Notification,
    NotificationCategory,
    NotificationPriority,
)
from apps.procurement.models import PurchaseRequest, PurchaseRequestStatus
from apps.projects.models import Project
from apps.tasks.models import Task, TaskStatus

User = get_user_model()


def get_notification_or_404(company: Company, user, notification_id) -> Notification:
    notification = (
        Notification.objects.filter(
            company=company,
            recipient=user,
            id=notification_id,
            is_deleted=False,
        )
        .select_related("project", "actor")
        .first()
    )
    if not notification:
        raise AmaniBuildAPIException("Notification not found.", code="not_found")
    return notification


def apply_notification_filters(queryset, request):
    category = request.query_params.get("category")
    if category:
        queryset = queryset.filter(category=category)

    is_read = request.query_params.get("is_read")
    if is_read is not None:
        if is_read.lower() in ("true", "1", "yes"):
            queryset = queryset.filter(is_read=True)
        elif is_read.lower() in ("false", "0", "no"):
            queryset = queryset.filter(is_read=False)

    project_id = request.query_params.get("project_id")
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(Q(title__icontains=search) | Q(body__icontains=search))

    return queryset


def create_notification(
    *,
    company: Company,
    recipient,
    title: str,
    body: str = "",
    category: str = NotificationCategory.GENERAL,
    priority: str = NotificationPriority.MEDIUM,
    project=None,
    actor=None,
    action_label: str = "",
    action_url: str = "",
    source_type: str = "",
    source_id=None,
    metadata=None,
) -> Notification:
    return Notification.objects.create(
        company=company,
        recipient=recipient,
        project=project,
        actor=actor,
        category=category,
        priority=priority,
        title=title,
        body=body,
        action_label=action_label,
        action_url=action_url,
        source_type=source_type,
        source_id=source_id,
        metadata=metadata or {},
    )


def record_activity_event(
    *,
    company: Company,
    event_type: str,
    title: str,
    summary: str = "",
    project=None,
    actor=None,
    occurred_at=None,
    source_type: str = "",
    source_id=None,
    metadata=None,
) -> ActivityEvent:
    return ActivityEvent.objects.create(
        company=company,
        project=project,
        actor=actor,
        event_type=event_type,
        title=title,
        summary=summary,
        occurred_at=occurred_at or timezone.now(),
        source_type=source_type,
        source_id=source_id,
        metadata=metadata or {},
    )


def get_notification_summary(user, company: Company) -> dict:
    queryset = Notification.objects.filter(company=company, recipient=user, is_deleted=False)
    unread = queryset.filter(is_read=False)
    category_counts = unread.values("category").annotate(count=Count("id"))
    counts_map = {row["category"]: row["count"] for row in category_counts}
    return {
        "unread_total": unread.count(),
        "critical": counts_map.get(NotificationCategory.CRITICAL, 0),
        "approval": counts_map.get(NotificationCategory.APPROVAL, 0),
        "inventory": counts_map.get(NotificationCategory.INVENTORY, 0),
        "mention": counts_map.get(NotificationCategory.MENTION, 0),
        "general": counts_map.get(NotificationCategory.GENERAL, 0),
    }


def mark_notification_read(notification: Notification) -> Notification:
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at", "updated_at"])
    return notification


def mark_all_notifications_read(user, company: Company) -> int:
    updated = Notification.objects.filter(
        company=company,
        recipient=user,
        is_read=False,
        is_deleted=False,
    ).update(is_read=True, read_at=timezone.now())
    return updated


def _user_can_approve_procurement(user, company: Company) -> bool:
    role = get_user_company_role(user, company)
    return role and role_has_permission(role, APPROVE_PROCUREMENT)


def _user_can_manage_inventory(user, company: Company) -> bool:
    role = get_user_company_role(user, company)
    return role and role_has_permission(role, MANAGE_INVENTORY)


def sync_actionable_notifications(user, company: Company) -> None:
    """Create or refresh actionable notifications from live domain state."""
    if _user_can_approve_procurement(user, company):
        pending = PurchaseRequest.objects.filter(
            company=company,
            is_deleted=False,
            status__in=[
                PurchaseRequestStatus.PENDING_MANAGER,
                PurchaseRequestStatus.PENDING_OWNER,
            ],
        ).select_related("project", "requested_by")
        for request in pending:
            exists = Notification.objects.filter(
                company=company,
                recipient=user,
                source_type="purchase_request",
                source_id=request.id,
                is_deleted=False,
                is_read=False,
            ).exists()
            if exists:
                continue
            create_notification(
                company=company,
                recipient=user,
                project=request.project,
                actor=request.requested_by,
                category=NotificationCategory.APPROVAL,
                priority=NotificationPriority.HIGH,
                title="Material purchase approval required",
                body=f"{request.title} — KES {request.total_amount:,.2f}",
                action_label="Review & Approve",
                action_url=f"/procurement/{request.id}",
                source_type="purchase_request",
                source_id=request.id,
                metadata={
                    "request_number": request.request_number,
                    "amount": str(request.total_amount),
                    "currency": request.currency,
                },
            )

    if _user_can_manage_inventory(user, company):
        low_stock_items = InventoryItem.objects.filter(
            company=company,
            is_deleted=False,
            is_active=True,
        )
        for item in low_stock_items:
            if item.stock_status not in {StockStatus.LOW_STOCK, StockStatus.AT_RISK}:
                continue
            exists = Notification.objects.filter(
                company=company,
                recipient=user,
                source_type="inventory_item",
                source_id=item.id,
                is_deleted=False,
                is_read=False,
            ).exists()
            if exists:
                continue
            create_notification(
                company=company,
                recipient=user,
                project=item.project,
                category=NotificationCategory.INVENTORY,
                priority=NotificationPriority.HIGH if item.stock_status == StockStatus.LOW_STOCK else NotificationPriority.MEDIUM,
                title="Low stock alert",
                body=(
                    f"{item.name} is below threshold "
                    f"(current: {item.quantity_on_hand} {item.unit}, "
                    f"reorder: {item.reorder_level} {item.unit})"
                ),
                action_label="View Inventory",
                action_url=f"/inventory/{item.id}",
                source_type="inventory_item",
                source_id=item.id,
                metadata={
                    "item_name": item.name,
                    "quantity_on_hand": str(item.quantity_on_hand),
                    "reorder_level": str(item.reorder_level),
                    "stock_status": item.stock_status,
                },
            )


def _append_event(events: list[dict], *, occurred_at, event_type, title, summary="", actor=None, project=None, source_type="", source_id=None, metadata=None):
    events.append(
        {
            "occurred_at": occurred_at,
            "event_type": event_type,
            "title": title,
            "summary": summary,
            "actor_name": actor.full_name if actor else None,
            "project_id": str(project.id) if project else None,
            "project_name": project.name if project else None,
            "source_type": source_type,
            "source_id": str(source_id) if source_id else None,
            "metadata": metadata or {},
        }
    )


def get_activity_timeline(company: Company, project_id=None, limit: int = 50) -> list[dict]:
    events: list[dict] = []

    diary_qs = SiteDiaryEntry.objects.filter(company=company, is_deleted=False).select_related("project", "created_by")
    if project_id:
        diary_qs = diary_qs.filter(project_id=project_id)
    for entry in diary_qs.filter(status__in=[DiaryEntryStatus.SUBMITTED, DiaryEntryStatus.APPROVED])[:20]:
        action = "approved" if entry.status == DiaryEntryStatus.APPROVED else "submitted"
        occurred_at = entry.approved_at or entry.submitted_at or entry.created_at
        _append_event(
            events,
            occurred_at=occurred_at,
            event_type=ActivityEventType.DIARY,
            title=f"Site diary {action}",
            summary=entry.project.name,
            actor=entry.approved_by if entry.status == DiaryEntryStatus.APPROVED else entry.created_by,
            project=entry.project,
            source_type="diary_entry",
            source_id=entry.id,
        )

    task_qs = Task.objects.filter(company=company, is_deleted=False, status=TaskStatus.DONE).select_related("project", "assignee")
    if project_id:
        task_qs = task_qs.filter(project_id=project_id)
    for task in task_qs.filter(completed_at__isnull=False)[:20]:
        _append_event(
            events,
            occurred_at=task.completed_at,
            event_type=ActivityEventType.TASK,
            title=f"Task marked complete: {task.title}",
            summary=task.project.name,
            actor=task.assignee,
            project=task.project,
            source_type="task",
            source_id=task.id,
        )

    procurement_qs = PurchaseRequest.objects.filter(company=company, is_deleted=False).select_related("project", "requested_by")
    if project_id:
        procurement_qs = procurement_qs.filter(project_id=project_id)
    for request in procurement_qs.filter(status=PurchaseRequestStatus.APPROVED, approved_at__isnull=False)[:20]:
        _append_event(
            events,
            occurred_at=request.approved_at,
            event_type=ActivityEventType.PROCUREMENT,
            title="Purchase request approved",
            summary=f"{request.title} — KES {request.total_amount:,.2f}",
            actor=request.requested_by,
            project=request.project,
            source_type="purchase_request",
            source_id=request.id,
        )

    document_qs = LibraryItem.objects.filter(company=company, is_deleted=False, is_current_version=True).select_related("project", "uploaded_by")
    if project_id:
        document_qs = document_qs.filter(project_id=project_id)
    for item in document_qs[:20]:
        _append_event(
            events,
            occurred_at=item.captured_at or item.created_at,
            event_type=ActivityEventType.DOCUMENT,
            title=f"Document uploaded: {item.title}",
            summary=item.project.name if item.project else item.folder_path,
            actor=item.uploaded_by,
            project=item.project,
            source_type="library_item",
            source_id=item.id,
        )

    stock_qs = StockMovement.objects.filter(company=company, is_deleted=False).select_related("item", "project", "performed_by")
    if project_id:
        stock_qs = stock_qs.filter(project_id=project_id)
    for movement in stock_qs[:20]:
        _append_event(
            events,
            occurred_at=movement.created_at,
            event_type=ActivityEventType.INVENTORY,
            title=f"Stock {movement.movement_type.replace('_', ' ')}",
            summary=f"{movement.item.name} — {movement.quantity} {movement.item.unit}",
            actor=movement.performed_by,
            project=movement.project,
            source_type="stock_movement",
            source_id=movement.id,
        )

    attendance_qs = AttendanceEvent.objects.filter(company=company, is_deleted=False).select_related("project", "worker")
    if project_id:
        attendance_qs = attendance_qs.filter(project_id=project_id)
    for event in attendance_qs[:20]:
        _append_event(
            events,
            occurred_at=event.event_at,
            event_type=ActivityEventType.ATTENDANCE,
            title=f"Worker {event.event_type.replace('_', ' ')}",
            summary=event.project.name,
            actor=event.worker,
            project=event.project,
            source_type="attendance_event",
            source_id=event.id,
        )

    stored_qs = ActivityEvent.objects.filter(company=company, is_deleted=False).select_related("project", "actor")
    if project_id:
        stored_qs = stored_qs.filter(project_id=project_id)
    for event in stored_qs[:20]:
        _append_event(
            events,
            occurred_at=event.occurred_at,
            event_type=event.event_type,
            title=event.title,
            summary=event.summary,
            actor=event.actor,
            project=event.project,
            source_type=event.source_type,
            source_id=event.source_id,
            metadata=event.metadata,
        )

    events.sort(key=lambda row: row["occurred_at"], reverse=True)
    trimmed = events[:limit]
    for row in trimmed:
        row["occurred_at"] = row["occurred_at"].isoformat()
    return trimmed
