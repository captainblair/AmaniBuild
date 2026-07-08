from django.contrib import admin

from apps.client_portal.models import ClientProjectAccess


@admin.register(ClientProjectAccess)
class ClientProjectAccessAdmin(admin.ModelAdmin):
    list_display = ("project", "client_user", "company", "can_view_budget", "is_active", "granted_by", "created_at")
    list_filter = ("is_active", "can_view_budget")
    search_fields = ("project__name", "client_user__email", "company__name")
