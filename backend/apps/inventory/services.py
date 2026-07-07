"""Inventory business logic."""

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from apps.companies.models import Company, Site
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.services import get_project_for_company
from apps.inventory.models import InventoryItem, MaterialCategory, StockMovement, StockMovementType, StockStatus
from apps.procurement.models import PurchaseRequest, PurchaseRequestStatus


def validate_site(company: Company, site: Site) -> None:
    if site.company_id != company.id or site.is_deleted:
        raise AmaniBuildAPIException("Site not found.", code="not_found")


def get_item_or_404(company: Company, item_id) -> InventoryItem:
    item = InventoryItem.objects.filter(company=company, id=item_id, is_deleted=False).select_related("site", "project").first()
    if not item:
        raise AmaniBuildAPIException("Inventory item not found.", code="not_found")
    return item


@transaction.atomic
def create_inventory_item(*, company: Company, data: dict) -> InventoryItem:
    site = Site.objects.filter(company=company, id=data["site_id"], is_deleted=False).first()
    if not site:
        raise AmaniBuildAPIException("Site not found.", code="not_found")

    project = None
    if data.get("project_id"):
        project = get_project_for_company(company, data["project_id"])

    sku = data.get("sku", "")
    if sku and InventoryItem.objects.filter(site=site, sku=sku, is_deleted=False).exists():
        raise AmaniBuildAPIException("SKU already exists at this site.", code="duplicate_sku")

    return InventoryItem.objects.create(
        company=company,
        site=site,
        project=project,
        name=data["name"],
        sku=sku,
        category=data.get("category", MaterialCategory.OTHER),
        unit=data.get("unit", "unit"),
        description=data.get("description", ""),
        location=data.get("location", ""),
        quantity_on_hand=data.get("quantity_on_hand", 0),
        reorder_level=data.get("reorder_level", 0),
        unit_cost=data.get("unit_cost", 0),
        currency=data.get("currency", "KES"),
        image_url=data.get("image_url", ""),
    )


@transaction.atomic
def update_inventory_item(item: InventoryItem, company: Company, data: dict) -> InventoryItem:
    if "site_id" in data:
        site = Site.objects.filter(company=company, id=data["site_id"], is_deleted=False).first()
        if not site:
            raise AmaniBuildAPIException("Site not found.", code="not_found")
        item.site = site

    if "project_id" in data:
        if data["project_id"]:
            item.project = get_project_for_company(company, data["project_id"])
        else:
            item.project = None

    if "sku" in data and data["sku"]:
        duplicate = (
            InventoryItem.objects.filter(site=item.site, sku=data["sku"], is_deleted=False)
            .exclude(pk=item.pk)
            .exists()
        )
        if duplicate:
            raise AmaniBuildAPIException("SKU already exists at this site.", code="duplicate_sku")

    for field in (
        "name",
        "sku",
        "category",
        "unit",
        "description",
        "location",
        "reorder_level",
        "unit_cost",
        "currency",
        "image_url",
        "is_active",
    ):
        if field in data:
            setattr(item, field, data[field])

    item.save()
    return item


@transaction.atomic
def record_stock_movement(
    *,
    item: InventoryItem,
    movement_type: str,
    quantity: Decimal,
    user,
    unit_cost: Decimal | None = None,
    project=None,
    purchase_request=None,
    notes: str = "",
) -> StockMovement:
    if quantity <= 0:
        raise AmaniBuildAPIException("Quantity must be greater than zero.", code="invalid_quantity")

    if movement_type in {StockMovementType.STOCK_OUT, StockMovementType.WASTAGE}:
        if item.quantity_on_hand < quantity:
            raise AmaniBuildAPIException("Insufficient stock on hand.", code="insufficient_stock")
        item.quantity_on_hand -= quantity
    else:
        item.quantity_on_hand += quantity
        if unit_cost is not None:
            item.unit_cost = unit_cost

    item.save(update_fields=["quantity_on_hand", "unit_cost", "updated_at"])

    return StockMovement.objects.create(
        company=item.company,
        item=item,
        movement_type=movement_type,
        quantity=quantity,
        unit_cost=unit_cost or item.unit_cost,
        balance_after=item.quantity_on_hand,
        project=project,
        purchase_request=purchase_request,
        notes=notes,
        performed_by=user,
    )


@transaction.atomic
def receive_from_purchase_request(*, item: InventoryItem, purchase_request: PurchaseRequest, quantity: Decimal, user, notes: str = "") -> StockMovement:
    if purchase_request.status != PurchaseRequestStatus.APPROVED:
        raise AmaniBuildAPIException("Only approved purchase requests can be received.", code="invalid_status")
    if purchase_request.company_id != item.company_id:
        raise AmaniBuildAPIException("Purchase request does not belong to this company.", code="forbidden")

    return record_stock_movement(
        item=item,
        movement_type=StockMovementType.STOCK_IN,
        quantity=quantity,
        user=user,
        project=purchase_request.project,
        purchase_request=purchase_request,
        notes=notes or f"Received from {purchase_request.request_number}",
    )


def get_inventory_dashboard(company: Company, *, site_id=None, project_id=None) -> dict:
    items = InventoryItem.objects.filter(company=company, is_deleted=False, is_active=True).select_related("site")
    if site_id:
        items = items.filter(site_id=site_id)
    if project_id:
        items = items.filter(project_id=project_id)

    item_list = list(items)
    low_stock = [i for i in item_list if i.stock_status == StockStatus.LOW_STOCK]
    at_risk = [i for i in item_list if i.stock_status == StockStatus.AT_RISK]
    stock_value = sum((i.stock_value for i in item_list), Decimal("0"))

    month_start = timezone.localdate().replace(day=1)
    wastage = StockMovement.objects.filter(
        company=company,
        movement_type=StockMovementType.WASTAGE,
        created_at__date__gte=month_start,
        is_deleted=False,
    ).aggregate(total=Sum("quantity"))["total"] or Decimal("0")

    stock_in = StockMovement.objects.filter(
        company=company,
        movement_type=StockMovementType.STOCK_IN,
        created_at__date__gte=month_start,
        is_deleted=False,
    ).aggregate(total=Sum("quantity"))["total"] or Decimal("0")
    wastage_percent = float((wastage / stock_in) * 100) if stock_in else 0.0

    category_breakdown = {}
    for item in item_list:
        category_breakdown.setdefault(item.category, Decimal("0"))
        category_breakdown[item.category] += item.stock_value

    total_value = stock_value or Decimal("1")
    breakdown = [
        {
            "category": category,
            "value": str(value),
            "percent": round(float(value / total_value) * 100, 1),
        }
        for category, value in sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)
    ]

    recent_movements = (
        StockMovement.objects.filter(company=company, is_deleted=False)
        .select_related("item", "performed_by")
        .order_by("-created_at")[:10]
    )
    recent = [
        {
            "id": str(m.id),
            "item_name": m.item.name,
            "movement_type": m.movement_type,
            "quantity": str(m.quantity),
            "unit": m.item.unit,
            "performed_by": m.performed_by.full_name if m.performed_by else None,
            "created_at": m.created_at.isoformat(),
        }
        for m in recent_movements
    ]

    return {
        "total_materials": len(item_list),
        "low_stock_alerts": len(low_stock),
        "at_risk_alerts": len(at_risk),
        "stock_value_total": str(stock_value),
        "currency": "KES",
        "wastage_percent_this_month": round(wastage_percent, 1),
        "category_breakdown": breakdown,
        "low_stock_items": [
            {
                "id": str(i.id),
                "name": i.name,
                "quantity_on_hand": str(i.quantity_on_hand),
                "reorder_level": str(i.reorder_level),
                "below_by": str(i.below_reorder_by),
                "unit": i.unit,
                "site_name": i.site.name,
            }
            for i in low_stock + at_risk
        ],
        "recent_movements": recent,
    }


def filter_items_by_status(queryset, status: str):
    if not status:
        return queryset
    if status == StockStatus.LOW_STOCK:
        return queryset.filter(quantity_on_hand__lt=F("reorder_level") * Decimal("0.75"), reorder_level__gt=0)
    if status == StockStatus.AT_RISK:
        return queryset.filter(
            quantity_on_hand__gte=F("reorder_level") * Decimal("0.75"),
            quantity_on_hand__lt=F("reorder_level"),
            reorder_level__gt=0,
        )
    if status == StockStatus.ON_TRACK:
        return queryset.filter(quantity_on_hand__gte=F("reorder_level"))
    return queryset
