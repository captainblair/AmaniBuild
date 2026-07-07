"""Procurement API views."""

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanApproveProcurement, CanManageProcurement, CanViewProcurement
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.diary.services import get_project_for_company
from apps.procurement.models import PurchaseRequest, PurchaseRequestStatus
from apps.procurement.serializers import (
    PurchaseRequestApproveSerializer,
    PurchaseRequestCreateUpdateSerializer,
    PurchaseRequestListSerializer,
    PurchaseRequestRejectSerializer,
    PurchaseRequestSerializer,
)
from apps.procurement.services import (
    approve_purchase_request,
    create_purchase_request,
    get_request_activity,
    reject_purchase_request,
    submit_purchase_request,
    update_purchase_request,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _request_queryset(company):
    return (
        PurchaseRequest.objects.filter(company=company, is_deleted=False)
        .select_related("project", "requested_by")
        .prefetch_related("lines", "approval_steps")
        .order_by("-created_at")
    )


def _get_request_or_404(company, request_id) -> PurchaseRequest:
    purchase_request = _request_queryset(company).filter(id=request_id).first()
    if not purchase_request:
        raise AmaniBuildAPIException("Purchase request not found.", code="not_found")
    return purchase_request


def _apply_filters(queryset, request):
    status_filter = request.query_params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    project_id = request.query_params.get("project_id")
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    category = request.query_params.get("category")
    if category:
        queryset = queryset.filter(category=category)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(request_number__icontains=search)
            | Q(justification__icontains=search)
        )
    return queryset


class PurchaseRequestListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageProcurement()]
        return [IsAuthenticated(), CanViewProcurement()]

    @extend_schema(tags=["Procurement"])
    def get(self, request):
        base_qs = _request_queryset(request.company)
        project_id = request.query_params.get("project_id")
        if project_id:
            base_qs = base_qs.filter(project_id=project_id)
        category = request.query_params.get("category")
        if category:
            base_qs = base_qs.filter(category=category)
        search = request.query_params.get("search")
        if search:
            base_qs = base_qs.filter(
                Q(title__icontains=search)
                | Q(request_number__icontains=search)
                | Q(justification__icontains=search)
            )

        queryset = _apply_filters(base_qs, request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = PurchaseRequestListSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["status_counts"] = {
            "all": base_qs.count(),
            "pending": base_qs.filter(
                status__in=[
                    PurchaseRequestStatus.PENDING_MANAGER,
                    PurchaseRequestStatus.PENDING_OWNER,
                ]
            ).count(),
            "approved": base_qs.filter(status=PurchaseRequestStatus.APPROVED).count(),
            "rejected": base_qs.filter(status=PurchaseRequestStatus.REJECTED).count(),
        }
        return response

    @extend_schema(request=PurchaseRequestCreateUpdateSerializer, tags=["Procurement"])
    def post(self, request):
        serializer = PurchaseRequestCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        project = get_project_for_company(request.company, data["project_id"])
        purchase_request = create_purchase_request(
            company=request.company,
            project=project,
            user=request.user,
            data=data,
        )
        return _success(
            {"request": PurchaseRequestSerializer(purchase_request).data},
            status.HTTP_201_CREATED,
        )


class PurchaseRequestDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewProcurement()]
        return [IsAuthenticated(), CanManageProcurement()]

    @extend_schema(tags=["Procurement"])
    def get(self, request, request_id):
        purchase_request = _get_request_or_404(request.company, request_id)
        return _success({"request": PurchaseRequestSerializer(purchase_request).data})

    @extend_schema(request=PurchaseRequestCreateUpdateSerializer, tags=["Procurement"])
    def patch(self, request, request_id):
        purchase_request = _get_request_or_404(request.company, request_id)
        serializer = PurchaseRequestCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if "project_id" in data:
            get_project_for_company(request.company, data["project_id"])
        purchase_request = update_purchase_request(purchase_request, data)
        return _success({"request": PurchaseRequestSerializer(purchase_request).data})

    @extend_schema(tags=["Procurement"])
    def delete(self, request, request_id):
        purchase_request = _get_request_or_404(request.company, request_id)
        if purchase_request.status != PurchaseRequestStatus.DRAFT:
            raise AmaniBuildAPIException("Only draft requests can be deleted.", code="invalid_status")
        purchase_request.soft_delete()
        return _success({"message": "Purchase request deleted."})


class PurchaseRequestSubmitView(APIView):
    permission_classes = [IsAuthenticated, CanManageProcurement]

    @extend_schema(tags=["Procurement"])
    def post(self, request, request_id):
        purchase_request = _get_request_or_404(request.company, request_id)
        purchase_request = submit_purchase_request(purchase_request)
        return _success({"request": PurchaseRequestSerializer(purchase_request).data})


class PurchaseRequestApproveView(APIView):
    permission_classes = [IsAuthenticated, CanApproveProcurement]

    @extend_schema(request=PurchaseRequestApproveSerializer, tags=["Procurement"])
    def post(self, request, request_id):
        purchase_request = _get_request_or_404(request.company, request_id)
        serializer = PurchaseRequestApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purchase_request = approve_purchase_request(
            purchase_request,
            request.user,
            notes=serializer.validated_data.get("notes", ""),
        )
        return _success({"request": PurchaseRequestSerializer(purchase_request).data})


class PurchaseRequestRejectView(APIView):
    permission_classes = [IsAuthenticated, CanApproveProcurement]

    @extend_schema(request=PurchaseRequestRejectSerializer, tags=["Procurement"])
    def post(self, request, request_id):
        purchase_request = _get_request_or_404(request.company, request_id)
        serializer = PurchaseRequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purchase_request = reject_purchase_request(
            purchase_request,
            request.user,
            reason=serializer.validated_data["reason"],
        )
        return _success({"request": PurchaseRequestSerializer(purchase_request).data})


class PurchaseRequestActivityView(APIView):
    permission_classes = [IsAuthenticated, CanViewProcurement]

    @extend_schema(tags=["Procurement"])
    def get(self, request, request_id):
        purchase_request = _get_request_or_404(request.company, request_id)
        return _success({"activity": get_request_activity(purchase_request)})
