from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import OTPChallenge, PasswordResetToken, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "phone", "is_active", "is_staff", "created_at")
    list_filter = ("is_active", "is_staff", "is_email_verified", "mfa_enabled")
    search_fields = ("email", "first_name", "last_name", "phone")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("first_name", "last_name", "phone")}),
        (
            "Verification",
            {"fields": ("is_active", "is_email_verified", "is_phone_verified", "mfa_enabled")},
        ),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Activity", {"fields": ("last_login", "last_login_at", "last_login_ip")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2"),
            },
        ),
    )


@admin.register(OTPChallenge)
class OTPChallengeAdmin(admin.ModelAdmin):
    list_display = ("id", "purpose", "email", "phone", "is_used", "expires_at", "attempts", "created_at")
    list_filter = ("purpose", "is_used")
    search_fields = ("email", "phone")
    readonly_fields = ("code_hash", "created_at", "updated_at")


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_used", "expires_at", "created_at")
    list_filter = ("is_used",)
    readonly_fields = ("token_hash", "created_at", "updated_at")
