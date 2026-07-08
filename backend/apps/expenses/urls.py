"""Expense URL routes."""

from django.urls import path

from apps.expenses.views import (
    ExpenseApproveView,
    ExpenseDashboardView,
    ExpenseDetailView,
    ExpenseListCreateView,
    ExpenseRejectView,
    ExpenseReimburseView,
    ExpenseSubmitView,
    ProjectExpenseListCreateView,
)

urlpatterns = [
    path("expenses/dashboard/", ExpenseDashboardView.as_view(), name="expense-dashboard"),
    path("expenses/", ExpenseListCreateView.as_view(), name="expense-list"),
    path("expenses/<uuid:expense_id>/", ExpenseDetailView.as_view(), name="expense-detail"),
    path("expenses/<uuid:expense_id>/submit/", ExpenseSubmitView.as_view(), name="expense-submit"),
    path("expenses/<uuid:expense_id>/approve/", ExpenseApproveView.as_view(), name="expense-approve"),
    path("expenses/<uuid:expense_id>/reject/", ExpenseRejectView.as_view(), name="expense-reject"),
    path("expenses/<uuid:expense_id>/reimburse/", ExpenseReimburseView.as_view(), name="expense-reimburse"),
    path(
        "projects/<uuid:project_id>/expenses/",
        ProjectExpenseListCreateView.as_view(),
        name="project-expense-list",
    ),
]
