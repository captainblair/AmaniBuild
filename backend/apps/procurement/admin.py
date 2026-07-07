from django.contrib import admin

from apps.procurement.models import PurchaseApprovalStep, PurchaseRequest, PurchaseRequestLine


class PurchaseRequestLineInline(admin.TabularInline):
    model = PurchaseRequestLine
    extra = 0


class PurchaseApprovalStepInline(admin.TabularInline):
    model = PurchaseApprovalStep
    extra = 0
    readonly_fields = ("acted_at",)


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ("request_number", "title", "project", "status", "total_amount", "requested_by", "created_at")
    list_filter = ("status", "category")
    search_fields = ("request_number", "title", "project__name")
    inlines = [PurchaseRequestLineInline, PurchaseApprovalStepInline]
    readonly_fields = ("request_number", "submitted_at", "approved_at", "rejected_at")
