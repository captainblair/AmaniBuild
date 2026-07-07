"""Inventory API views."""

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanManageInventory, CanViewInventory
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.inventory.models import InventoryItem, StockMovement, StockMovementType, StockStatus
from apps.inventory.serializers import (
    InventoryItemCreateUpdateSerializer,
    InventoryItemListSerializer,
    InventoryItemSerializer,
    StockMovementCreateSerializer,
    StockMovementSerializer,
    StockOutSerializer,
)
from apps.inventory.services import (
    create_inventory_item,
    filter_items_by_status,
    get_inventory_dashboard,
    get_item_or_404,
    receive_from_purchase_request,
    record_stock_movement,
    update_inventory_item,
)
from apps.procurement.models import PurchaseRequest


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _item_queryset(company):
    return InventoryItem.objects.filter(company=company, is_deleted=False).select_related("site", "project")


class InventoryDashboardView(APIView):
    permission_classes = [IsAuthenticated, CanViewInventory]

    @extend_schema(tags=["Inventory"])
    def get(self, request):
        site_id = request.query_params.get("site_id")
        project_id = request.query_params.get("project_id")
        return _success(
            {
                "dashboard": get_inventory_dashboard(
                    request.company,
                    site_id=site_id,
                    project_id=project_id,
                )
            }
        )


class InventoryItemListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageInventory()]
        return [IsAuthenticated(), CanViewInventory()]

    @extend_schema(tags=["Inventory"])
    def get(self, request):
        queryset = _item_queryset(request.company)
        site_id = request.query_params.get("site_id")
        if site_id:
            queryset = queryset.filter(site_id=site_id)
        project_id = request.query_params.get("project_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        category = request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)
        status_filter = request.query_params.get("status")
        queryset = filter_items_by_status(queryset, status_filter)
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(sku__icontains=search))

        base_qs = _item_queryset(request.company)
        if site_id:
            base_qs = base_qs.filter(site_id=site_id)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset.order_by("name"), request)
        response = paginator.get_paginated_response(InventoryItemListSerializer(page, many=True).data)
        response.data["status_counts"] = {
            "all": base_qs.count(),
            "low_stock": filter_items_by_status(base_qs, StockStatus.LOW_STOCK).count(),
            "at_risk": filter_items_by_status(base_qs, StockStatus.AT_RISK).count(),
            "on_track": filter_items_by_status(base_qs, StockStatus.ON_TRACK).count(),
        }
        return response

    @extend_schema(request=InventoryItemCreateUpdateSerializer, tags=["Inventory"])
    def post(self, request):
        serializer = InventoryItemCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_inventory_item(company=request.company, data=serializer.validated_data)
        return _success({"item": InventoryItemSerializer(item).data}, status.HTTP_201_CREATED)


class InventoryItemDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewInventory()]
        return [IsAuthenticated(), CanManageInventory()]

    @extend_schema(tags=["Inventory"])
    def get(self, request, item_id):
        item = get_item_or_404(request.company, item_id)
        return _success({"item": InventoryItemSerializer(item).data})

    @extend_schema(request=InventoryItemCreateUpdateSerializer, tags=["Inventory"])
    def patch(self, request, item_id):
        item = get_item_or_404(request.company, item_id)
        serializer = InventoryItemCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = update_inventory_item(item, request.company, serializer.validated_data)
        return _success({"item": InventoryItemSerializer(item).data})

    @extend_schema(tags=["Inventory"])
    def delete(self, request, item_id):
        item = get_item_or_404(request.company, item_id)
        item.soft_delete()
        return _success({"message": "Inventory item archived."})


class InventoryStockInView(APIView):
    permission_classes = [IsAuthenticated, CanManageInventory]

    @extend_schema(request=StockMovementCreateSerializer, tags=["Inventory"])
    def post(self, request, item_id):
        item = get_item_or_404(request.company, item_id)
        serializer = StockMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        purchase_request = None
        if data.get("purchase_request_id"):
            purchase_request = PurchaseRequest.objects.filter(
                company=request.company,
                id=data["purchase_request_id"],
                is_deleted=False,
            ).first()
            if not purchase_request:
                raise AmaniBuildAPIException("Purchase request not found.", code="not_found")
            movement = receive_from_purchase_request(
                item=item,
                purchase_request=purchase_request,
                quantity=data["quantity"],
                user=request.user,
                notes=data.get("notes", ""),
            )
        else:
            movement = record_stock_movement(
                item=item,
                movement_type=StockMovementType.STOCK_IN,
                quantity=data["quantity"],
                user=request.user,
                unit_cost=data.get("unit_cost"),
                notes=data.get("notes", ""),
            )

        item.refresh_from_db()
        return _success(
            {
                "movement": StockMovementSerializer(movement).data,
                "item": InventoryItemSerializer(item).data,
            },
            status.HTTP_201_CREATED,
        )


class InventoryStockOutView(APIView):
    permission_classes = [IsAuthenticated, CanManageInventory]

    @extend_schema(request=StockOutSerializer, tags=["Inventory"])
    def post(self, request, item_id):
        item = get_item_or_404(request.company, item_id)
        serializer = StockOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        movement = record_stock_movement(
            item=item,
            movement_type=data["movement_type"],
            quantity=data["quantity"],
            user=request.user,
            notes=data.get("notes", ""),
        )
        item.refresh_from_db()
        return _success(
            {
                "movement": StockMovementSerializer(movement).data,
                "item": InventoryItemSerializer(item).data,
            },
            status.HTTP_201_CREATED,
        )


class InventoryItemMovementsView(APIView):
    permission_classes = [IsAuthenticated, CanViewInventory]

    @extend_schema(tags=["Inventory"])
    def get(self, request, item_id):
        item = get_item_or_404(request.company, item_id)
        movements = item.movements.filter(is_deleted=False).select_related("performed_by")
        return _success({"movements": StockMovementSerializer(movements, many=True).data})
