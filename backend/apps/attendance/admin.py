from django.contrib import admin

from apps.attendance.models import AttendanceEvent, AttendanceManualMark, CheckInPoint, ProjectWorkerAssignment


@admin.register(ProjectWorkerAssignment)
class ProjectWorkerAssignmentAdmin(admin.ModelAdmin):
    list_display = ("worker", "project", "trade", "employee_code", "is_active")
    list_filter = ("trade", "is_active")
    search_fields = ("worker__email", "project__name", "employee_code")


@admin.register(CheckInPoint)
class CheckInPointAdmin(admin.ModelAdmin):
    list_display = ("name", "site", "code", "is_active")
    search_fields = ("name", "code", "site__name")
    readonly_fields = ("code",)


@admin.register(AttendanceEvent)
class AttendanceEventAdmin(admin.ModelAdmin):
    list_display = ("worker", "project", "event_type", "event_at", "method", "is_late")
    list_filter = ("event_type", "method", "is_late")
    search_fields = ("worker__email", "project__name")


@admin.register(AttendanceManualMark)
class AttendanceManualMarkAdmin(admin.ModelAdmin):
    list_display = ("worker", "project", "work_date", "status", "marked_by")
    list_filter = ("status",)
