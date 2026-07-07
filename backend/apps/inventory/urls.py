"""Inventory URL routes."""

from django.urls import path

from apps.inventory.views import (
    InventoryDashboardView,
    InventoryItemDetailView,
    InventoryItemListCreateView,
    InventoryItemMovementsView,
    InventoryStockInView,
    InventoryStockOutView,
)

urlpatterns = [
    path("inventory/dashboard/", InventoryDashboardView.as_view(), name="inventory-dashboard"),
    path("inventory/items/", InventoryItemListCreateView.as_view(), name="inventory-item-list"),
    path("inventory/items/<uuid:item_id>/", InventoryItemDetailView.as_view(), name="inventory-item-detail"),
    path("inventory/items/<uuid:item_id>/stock-in/", InventoryStockInView.as_view(), name="inventory-stock-in"),
    path("inventory/items/<uuid:item_id>/stock-out/", InventoryStockOutView.as_view(), name="inventory-stock-out"),
    path(
        "inventory/items/<uuid:item_id>/movements/",
        InventoryItemMovementsView.as_view(),
        name="inventory-item-movements",
    ),
]
