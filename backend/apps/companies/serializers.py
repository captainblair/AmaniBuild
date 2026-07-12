"""Company and onboarding serializers."""

from rest_framework import serializers

from apps.companies.models import (
    Company,
    CompanyMembership,
    CompanyRole,
    Site,
    SiteStatus,
    SiteType,
    SubscriptionPlan,
    TeamInvitation,
)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "code",
            "name",
            "description",
            "price_kes_monthly",
            "max_projects",
            "max_users",
            "max_storage_gb",
        ]


class CompanySerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    is_onboarding_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "slug",
            "legal_name",
            "registration_number",
            "kra_pin",
            "email",
            "phone",
            "website",
            "address_line",
            "city",
            "county",
            "country",
            "plan",
            "onboarding_step",
            "onboarding_completed_at",
            "is_onboarding_complete",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "onboarding_completed_at", "created_at"]


class CompanyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    legal_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    kra_pin = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    address_line = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    county = serializers.CharField(max_length=100, required=False, allow_blank=True)
    plan_code = serializers.ChoiceField(
        choices=SubscriptionPlan.Tier.choices,
        default=SubscriptionPlan.Tier.FREE,
        required=False,
    )


class CompanyPlanChangeSerializer(serializers.Serializer):
    plan_code = serializers.ChoiceField(choices=SubscriptionPlan.Tier.choices)


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = [
            "id",
            "name",
            "code",
            "site_type",
            "status",
            "address_line",
            "city",
            "county",
            "country",
            "latitude",
            "longitude",
            "expected_start_date",
            "expected_end_date",
            "description",
            "is_primary",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SiteCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    site_type = serializers.ChoiceField(choices=SiteType.choices, required=False)
    status = serializers.ChoiceField(choices=SiteStatus.choices, required=False)
    address_line = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    county = serializers.CharField(max_length=100, required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    expected_start_date = serializers.DateField(required=False, allow_null=True)
    expected_end_date = serializers.DateField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    is_primary = serializers.BooleanField(required=False)


class SiteUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    site_type = serializers.ChoiceField(choices=SiteType.choices, required=False)
    status = serializers.ChoiceField(choices=SiteStatus.choices, required=False)
    address_line = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    county = serializers.CharField(max_length=100, required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    expected_start_date = serializers.DateField(required=False, allow_null=True)
    expected_end_date = serializers.DateField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    is_primary = serializers.BooleanField(required=False)


class OnboardingStatusSerializer(serializers.Serializer):
    has_company = serializers.BooleanField()
    onboarding_step = serializers.CharField(allow_null=True)
    is_complete = serializers.BooleanField()
    company = CompanySerializer(allow_null=True)
    primary_site = SiteSerializer(allow_null=True)
    next_action = serializers.CharField(allow_null=True)


class CompanyMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = CompanyMembership
        fields = [
            "id",
            "user_id",
            "user_email",
            "user_name",
            "role",
            "job_title",
            "is_active",
            "joined_at",
        ]
        read_only_fields = ["id", "user_id", "user_email", "user_name", "joined_at"]


class CompanyMembershipUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=CompanyRole.choices, required=False)
    job_title = serializers.CharField(max_length=150, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class UserCompanyContextSerializer(serializers.ModelSerializer):
    company_id = serializers.UUIDField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_slug = serializers.CharField(source="company.slug", read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = CompanyMembership
        fields = [
            "company_id",
            "company_name",
            "company_slug",
            "role",
            "job_title",
            "permissions",
            "joined_at",
        ]

    def get_permissions(self, obj):
        from apps.companies.services import get_role_permissions

        return get_role_permissions(obj.role)


class TeamInvitationSerializer(serializers.ModelSerializer):
    invited_by_email = serializers.EmailField(source="invited_by.email", read_only=True)
    role_label = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = TeamInvitation
        fields = [
            "id",
            "email",
            "role",
            "role_label",
            "job_title",
            "message",
            "status",
            "invited_by_email",
            "expires_at",
            "is_expired",
            "created_at",
        ]
        read_only_fields = fields

    def get_role_label(self, obj):
        return dict(CompanyRole.choices).get(obj.role, obj.role)


class TeamInvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=CompanyRole.choices)
    job_title = serializers.CharField(max_length=150, required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True)


class InvitationAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()


class CompanyRoleOptionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()

