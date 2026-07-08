from django.contrib import admin

from apps.scheduling.models import ScheduleDependency, ScheduleItem, SchedulePhase


@admin.register(SchedulePhase)
class SchedulePhaseAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "company", "sort_order", "color")
    search_fields = ("name", "project__name")


@admin.register(ScheduleItem)
class ScheduleItemAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "start_date", "end_date", "status", "progress_percent", "is_milestone")
    list_filter = ("status", "is_milestone")
    search_fields = ("title", "project__name")


@admin.register(ScheduleDependency)
class ScheduleDependencyAdmin(admin.ModelAdmin):
    list_display = ("predecessor", "successor", "dependency_type", "lag_days")
