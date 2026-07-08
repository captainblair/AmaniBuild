from django.contrib import admin

from apps.inspections.models import Inspection


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = (
        "inspection_number",
        "title",
        "project",
        "inspection_type",
        "status",
        "result",
        "score_percent",
        "inspector",
        "scheduled_date",
        "created_at",
    )
    list_filter = ("status", "inspection_type", "result")
    search_fields = ("inspection_number", "title", "project__name", "area_location")
    readonly_fields = ("inspection_number", "submitted_at", "reviewed_at", "reviewed_by", "inspected_at")
