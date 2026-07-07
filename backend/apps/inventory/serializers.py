"""Inventory serializers."""

from rest_framework import serializers

from apps.inventory.models import InventoryItem, MaterialCategory, StockMovement, StockMovementType


class InventoryItemListSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="site.name", read_only=True)
    stock_status = serializers.CharField(read_only=True)
    stock_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    below_reorder_by = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "sku",
            "category",
            "quantity_on_hand",
            "unit",
            "reorder_level",
            "unit_cost",
            "currency",
            "stock_status",
            "stock_value",
            "below_reorder_by",
            "site",
            "site_name",
            "location",
            "image_url",
            "is_active",
        ]


class InventoryItemSerializer(InventoryItemListSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)

    class Meta(InventoryItemListSerializer.Meta):
        fields = InventoryItemListSerializer.Meta.fields + [
            "project",
            "project_name",
            "description",
            "created_at",
            "updated_at",
        ]


class InventoryItemCreateUpdateSerializer(serializers.Serializer):
    site_id = serializers.UUIDField()
    project_id = serializers.UUIDField(required=False, allow_null=True)
    name = serializers.CharField(max_length=255)
    sku = serializers.CharField(max_length=50, required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=MaterialCategory.choices, required=False)
    unit = serializers.CharField(max_length=32, required=False, default="unit")
    description = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    quantity_on_hand = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    reorder_level = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    unit_cost = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    currency = serializers.CharField(max_length=3, required=False, default="KES")
    image_url = serializers.URLField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.full_name", read_only=True, default=None)
    unit = serializers.CharField(source="item.unit", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "item",
            "item_name",
            "movement_type",
            "quantity",
            "unit",
            "unit_cost",
            "balance_after",
            "notes",
            "performed_by_name",
            "created_at",
        ]


class StockMovementCreateSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=14, decimal_places=2)
    unit_cost = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    purchase_request_id = serializers.UUIDField(required=False, allow_null=True)


class StockOutSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=14, decimal_places=2)
    movement_type = serializers.ChoiceField(
        choices=[StockMovementType.STOCK_OUT, StockMovementType.WASTAGE],
        default=StockMovementType.STOCK_OUT,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
