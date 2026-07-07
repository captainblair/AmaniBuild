"""Inventory and stock management models."""

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class MaterialCategory(models.TextChoices):
    CEMENT = "cement", "Cement"
    STEEL = "steel", "Steel"
    AGGREGATES = "aggregates", "Aggregates"
    TIMBER = "timber", "Timber"
    ELECTRICAL = "electrical", "Electrical"
    PLUMBING = "plumbing", "Plumbing"
    TOOLS = "tools", "Tools"
    OTHER = "other", "Other"


class StockStatus(models.TextChoices):
    ON_TRACK = "on_track", "On Track"
    AT_RISK = "at_risk", "At Risk"
    LOW_STOCK = "low_stock", "Low Stock"


class StockMovementType(models.TextChoices):
    STOCK_IN = "stock_in", "Stock In"
    STOCK_OUT = "stock_out", "Stock Out"
    WASTAGE = "wastage", "Wastage"
    ADJUSTMENT = "adjustment", "Adjustment"


class InventoryItem(TenantScopedModel):
    """Material tracked at a company site."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="inventory_items",
    )
    site = models.ForeignKey(
        "companies.Site",
        on_delete=models.CASCADE,
        related_name="inventory_items",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_items",
    )

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, blank=True)
    category = models.CharField(max_length=32, choices=MaterialCategory.choices, default=MaterialCategory.OTHER)
    unit = models.CharField(max_length=32, default="unit")
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)

    quantity_on_hand = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="KES")
    image_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["company", "category"]),
            models.Index(fields=["site", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.quantity_on_hand} {self.unit})"

    @property
    def stock_value(self):
        return self.quantity_on_hand * self.unit_cost

    @property
    def stock_status(self) -> str:
        if self.reorder_level <= 0:
            return StockStatus.ON_TRACK
        ratio = float(self.quantity_on_hand / self.reorder_level) if self.reorder_level else 1
        if ratio < 0.75:
            return StockStatus.LOW_STOCK
        if ratio < 1.0:
            return StockStatus.AT_RISK
        return StockStatus.ON_TRACK

    @property
    def below_reorder_by(self):
        if self.quantity_on_hand >= self.reorder_level:
            return 0
        return self.reorder_level - self.quantity_on_hand


class StockMovement(TenantScopedModel):
    """Stock in/out/wastage movement for an inventory item."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="stock_movements",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(max_length=16, choices=StockMovementType.choices)
    quantity = models.DecimalField(max_digits=14, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    purchase_request = models.ForeignKey(
        "procurement.PurchaseRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_movements",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["item", "created_at"]),
            models.Index(fields=["company", "movement_type"]),
        ]

    def __str__(self):
        return f"{self.movement_type} {self.quantity} — {self.item.name}"
