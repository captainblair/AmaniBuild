from django.contrib import admin

from apps.companies.models import Company, CompanyMembership, Site, SubscriptionPlan, TeamInvitation



@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "price_kes_monthly", "max_projects", "max_users", "is_active")
    list_filter = ("is_active",)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "owner", "plan", "onboarding_step", "county", "created_at")
    list_filter = ("onboarding_step", "plan", "county")
    search_fields = ("name", "slug", "owner__email")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(CompanyMembership)
class CompanyMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "role", "is_active", "joined_at")
    list_filter = ("role", "is_active")
    search_fields = ("user__email", "company__name")


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "city", "county", "status", "is_primary")
    list_filter = ("status", "site_type", "is_primary")
    search_fields = ("name", "company__name")


@admin.register(TeamInvitation)
class TeamInvitationAdmin(admin.ModelAdmin):
    list_display = ("email", "company", "role", "status", "invited_by", "expires_at", "created_at")
    list_filter = ("status", "role")
    search_fields = ("email", "company__name", "invited_by__email")
    readonly_fields = ("token_hash", "accepted_at", "accepted_by")
