"""Expense API views."""

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanApproveExpenses, CanManageExpenses, CanViewExpenses
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.diary.services import get_project_for_company
from apps.expenses.models import Expense
from apps.expenses.serializers import (
    ExpenseCreateUpdateSerializer,
    ExpenseListSerializer,
    ExpenseRejectSerializer,
    ExpenseSerializer,
)
from apps.expenses.services import (
    approve_expense,
    create_expense,
    get_expense_dashboard,
    mark_expense_reimbursed,
    reject_expense,
    submit_expense,
    update_expense,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _expense_queryset(company):
    return (
        Expense.objects.filter(company=company, is_deleted=False)
        .select_related("project", "recorded_by", "approved_by")
        .order_by("-expense_date", "-created_at")
    )


def _get_expense_or_404(company, expense_id) -> Expense:
    expense = _expense_queryset(company).filter(id=expense_id).first()
    if not expense:
        raise AmaniBuildAPIException("Expense not found.", code="not_found")
    return expense


def _apply_filters(queryset, request):
    status_filter = request.query_params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    category = request.query_params.get("category")
    if category:
        queryset = queryset.filter(category=category)

    project_id = request.query_params.get("project_id")
    if project_id:
        queryset = queryset.filter(project_id=project_id)

    date_from = request.query_params.get("date_from")
    if date_from:
        queryset = queryset.filter(expense_date__gte=date_from)

    date_to = request.query_params.get("date_to")
    if date_to:
        queryset = queryset.filter(expense_date__lte=date_to)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(expense_number__icontains=search)
            | Q(vendor_name__icontains=search)
            | Q(description__icontains=search)
        )
    return queryset


class ExpenseDashboardView(APIView):
    permission_classes = [IsAuthenticated, CanViewExpenses]

    @extend_schema(tags=["Expenses"])
    def get(self, request):
        project_id = request.query_params.get("project_id")
        return _success({"dashboard": get_expense_dashboard(request.company, project_id)})


class ExpenseListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageExpenses()]
        return [IsAuthenticated(), CanViewExpenses()]

    @extend_schema(tags=["Expenses"])
    def get(self, request):
        queryset = _apply_filters(_expense_queryset(request.company), request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ExpenseListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=["Expenses"])
    def post(self, request):
        serializer = ExpenseCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project_id = request.data.get("project_id")
        if not project_id:
            raise AmaniBuildAPIException("project_id is required.", code="validation_error")
        project = get_project_for_company(request.company, project_id)
        expense = create_expense(
            company=request.company,
            project=project,
            user=request.user,
            data=serializer.validated_data,
        )
        return _success(
            {"expense": ExpenseSerializer(expense).data},
            status_code=status.HTTP_201_CREATED,
        )


class ProjectExpenseListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageExpenses()]
        return [IsAuthenticated(), CanViewExpenses()]

    @extend_schema(tags=["Expenses"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        queryset = _apply_filters(
            _expense_queryset(request.company).filter(project=project),
            request,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ExpenseListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=["Expenses"])
    def post(self, request, project_id):
        serializer = ExpenseCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_project_for_company(request.company, project_id)
        expense = create_expense(
            company=request.company,
            project=project,
            user=request.user,
            data=serializer.validated_data,
        )
        return _success(
            {"expense": ExpenseSerializer(expense).data},
            status_code=status.HTTP_201_CREATED,
        )


class ExpenseDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewExpenses()]
        return [IsAuthenticated(), CanManageExpenses()]

    @extend_schema(tags=["Expenses"])
    def get(self, request, expense_id):
        expense = _get_expense_or_404(request.company, expense_id)
        return _success({"expense": ExpenseSerializer(expense).data})

    @extend_schema(tags=["Expenses"])
    def patch(self, request, expense_id):
        expense = _get_expense_or_404(request.company, expense_id)
        serializer = ExpenseCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        expense = update_expense(expense, serializer.validated_data)
        return _success({"expense": ExpenseSerializer(expense).data})

    @extend_schema(tags=["Expenses"])
    def delete(self, request, expense_id):
        expense = _get_expense_or_404(request.company, expense_id)
        expense.soft_delete()
        return _success({"deleted": True})


class ExpenseSubmitView(APIView):
    permission_classes = [IsAuthenticated, CanManageExpenses]

    @extend_schema(tags=["Expenses"])
    def post(self, request, expense_id):
        expense = _get_expense_or_404(request.company, expense_id)
        expense = submit_expense(expense)
        return _success({"expense": ExpenseSerializer(expense).data})


class ExpenseApproveView(APIView):
    permission_classes = [IsAuthenticated, CanApproveExpenses]

    @extend_schema(tags=["Expenses"])
    def post(self, request, expense_id):
        expense = _get_expense_or_404(request.company, expense_id)
        expense = approve_expense(expense, request.user)
        return _success({"expense": ExpenseSerializer(expense).data})


class ExpenseRejectView(APIView):
    permission_classes = [IsAuthenticated, CanApproveExpenses]

    @extend_schema(tags=["Expenses"])
    def post(self, request, expense_id):
        expense = _get_expense_or_404(request.company, expense_id)
        serializer = ExpenseRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = reject_expense(expense, request.user, serializer.validated_data.get("reason", ""))
        return _success({"expense": ExpenseSerializer(expense).data})


class ExpenseReimburseView(APIView):
    permission_classes = [IsAuthenticated, CanApproveExpenses]

    @extend_schema(tags=["Expenses"])
    def post(self, request, expense_id):
        expense = _get_expense_or_404(request.company, expense_id)
        expense = mark_expense_reimbursed(expense)
        return _success({"expense": ExpenseSerializer(expense).data})
