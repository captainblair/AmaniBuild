from django.contrib import admin

from apps.projects.models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "company",
        "status",
        "project_type",
        "budget_total",
        "progress_percent",
        "site",
        "created_at",
    )
    list_filter = ("status", "project_type")
    search_fields = ("name", "code", "slug", "company__name", "client_name")
    readonly_fields = ("slug",)
