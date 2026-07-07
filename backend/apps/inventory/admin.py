from django.contrib import admin

from apps.inventory.models import InventoryItem, StockMovement


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ("name", "site", "category", "quantity_on_hand", "unit", "reorder_level", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name", "sku", "site__name")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("item", "movement_type", "quantity", "balance_after", "performed_by", "created_at")
    list_filter = ("movement_type",)
