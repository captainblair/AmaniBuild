from django.contrib import admin

from apps.tasks.models import Task, TaskComment


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "company",
        "status",
        "priority",
        "assignee",
        "due_date",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "priority")
    search_fields = ("title", "description", "project__name", "company__name")
    readonly_fields = ("completed_at",)


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ("task", "author", "company", "created_at")
    search_fields = ("body", "task__title")
