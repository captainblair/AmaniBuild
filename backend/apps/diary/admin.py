from django.contrib import admin

from apps.diary.models import SiteDiaryEntry


@admin.register(SiteDiaryEntry)
class SiteDiaryEntryAdmin(admin.ModelAdmin):
    list_display = (
        "entry_date",
        "project",
        "company",
        "status",
        "progress_percent",
        "workforce_count",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "weather_condition")
    search_fields = ("project__name", "work_description", "company__name")
    readonly_fields = ("submitted_at", "approved_at", "approved_by")
