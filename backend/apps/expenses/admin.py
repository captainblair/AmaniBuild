from django.contrib import admin

from apps.expenses.models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "expense_number",
        "title",
        "project",
        "category",
        "amount",
        "status",
        "expense_date",
        "recorded_by",
        "created_at",
    )
    list_filter = ("status", "category", "payment_method")
    search_fields = ("expense_number", "title", "vendor_name", "project__name")
    readonly_fields = ("expense_number", "submitted_at", "approved_at", "rejected_at", "reimbursed_at")
