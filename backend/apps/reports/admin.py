from django.contrib import admin

from apps.reports.models import GeneratedReport


@admin.register(GeneratedReport)
class GeneratedReportAdmin(admin.ModelAdmin):
    list_display = ("title", "report_type", "company", "project", "generated_by", "created_at")
    list_filter = ("report_type", "status", "output_format")
    search_fields = ("title", "company__name", "project__name")

