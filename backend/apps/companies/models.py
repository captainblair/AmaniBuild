"""Company tenant and onboarding models."""

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.core.models import BaseModel, TenantScopedModel


class SubscriptionPlan(models.Model):
    """SaaS pricing tier — aligns with pricing plans wireframe."""

    class Tier(models.TextChoices):
        FREE = "free", "Free"
        STARTER = "starter", "Starter"
        PROFESSIONAL = "professional", "Professional"
        ENTERPRISE = "enterprise", "Enterprise"

    code = models.CharField(max_length=32, choices=Tier.choices, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price_kes_monthly = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_projects = models.PositiveIntegerField(default=1)
    max_users = models.PositiveIntegerField(default=5)
    max_storage_gb = models.PositiveIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "price_kes_monthly"]

    def __str__(self):
        return self.name


class OnboardingStep(models.TextChoices):
    COMPANY_PROFILE = "company_profile", "Company Profile"
    FIRST_SITE = "first_site", "First Site"
    INVITE_TEAM = "invite_team", "Invite Team"
    COMPLETE = "complete", "Complete"


class Company(BaseModel):
    """Tenant — a construction company using AmaniBuild."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    legal_name = models.CharField(max_length=255, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    kra_pin = models.CharField(max_length=20, blank=True)

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)

    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    county = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=2, default="KE")

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_companies",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="companies",
    )

    onboarding_step = models.CharField(
        max_length=32,
        choices=OnboardingStep.choices,
        default=OnboardingStep.COMPANY_PROFILE,
    )
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)

    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name_plural = "companies"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "company"
            slug = base
            counter = 1
            while Company.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def is_onboarding_complete(self):
        return self.onboarding_step == OnboardingStep.COMPLETE


class CompanyRole(models.TextChoices):
    OWNER = "owner", "Company Owner"
    PROJECT_MANAGER = "project_manager", "Project Manager"
    SITE_ENGINEER = "site_engineer", "Site Engineer"
    FOREMAN = "foreman", "Foreman"
    ACCOUNTANT = "accountant", "Accountant"
    STORE_KEEPER = "store_keeper", "Store Keeper"
    WORKER = "worker", "Worker"
    CLIENT = "client", "Client"


class CompanyMembership(BaseModel):
    """Links users to a company with a role."""

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_memberships",
    )
    role = models.CharField(max_length=32, choices=CompanyRole.choices, default=CompanyRole.WORKER)
    job_title = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("company", "user")]
        ordering = ["-joined_at"]

    def __str__(self):
        return f"{self.user.email} @ {self.company.name} ({self.role})"


class InvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    EXPIRED = "expired", "Expired"
    REVOKED = "revoked", "Revoked"


class TeamInvitation(BaseModel):
    """Email invitation to join a company with a specific role."""

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField(db_index=True)
    role = models.CharField(max_length=32, choices=CompanyRole.choices)
    job_title = models.CharField(max_length=150, blank=True)
    message = models.TextField(blank=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_invitations",
    )
    token_hash = models.CharField(max_length=255)
    status = models.CharField(
        max_length=16,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
    )
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_invitations",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["email", "status"]),
        ]

    def __str__(self):
        return f"Invite {self.email} → {self.company.name} ({self.role})"

    @property
    def is_expired(self) -> bool:
        from django.utils import timezone

        return self.expires_at < timezone.now()


class SiteType(models.TextChoices):
    RESIDENTIAL = "residential", "Residential"
    COMMERCIAL = "commercial", "Commercial"
    INDUSTRIAL = "industrial", "Industrial"
    INFRASTRUCTURE = "infrastructure", "Infrastructure"
    MIXED_USE = "mixed_use", "Mixed Use"


class SiteStatus(models.TextChoices):
    PLANNING = "planning", "Planning"
    ACTIVE = "active", "Active"
    ON_HOLD = "on_hold", "On Hold"
    COMPLETED = "completed", "Completed"


class Site(TenantScopedModel):
    """Physical construction site belonging to a company."""

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="sites")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)

    site_type = models.CharField(max_length=32, choices=SiteType.choices, default=SiteType.RESIDENTIAL)
    status = models.CharField(max_length=32, choices=SiteStatus.choices, default=SiteStatus.PLANNING)

    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    county = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=2, default="KE")

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    expected_start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)

    description = models.TextField(blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary", "name"]
        unique_together = [("company", "code")]

    def __str__(self):
        return f"{self.name} ({self.company.name})"
