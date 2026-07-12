"""Multi-tenancy helpers."""

from apps.companies.models import Company, CompanyMembership, CompanyRole, OnboardingStep
from apps.companies.rbac import ROLE_PERMISSIONS, role_has_permission


def get_user_companies(user):
    if not user or not user.is_authenticated:
        return Company.objects.none()
    return Company.objects.filter(
        memberships__user=user,
        memberships__is_active=True,
        is_deleted=False,
    ).distinct()


def get_user_primary_company(user) -> Company | None:
    return get_user_companies(user).order_by("-created_at").first()


def resolve_request_company(user, company_id: str | None = None) -> Company | None:
    if not user or not user.is_authenticated:
        return None
    qs = get_user_companies(user)
    if company_id:
        return qs.filter(id=company_id).first()
    return qs.order_by("-created_at").first()


def attach_request_company(request) -> Company | None:
    """
    Resolve tenant after DRF JWT authentication.
    Django middleware runs before JWT, so company context is bound here.
    """
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        request.company = None
        return None
    company_id = request.headers.get("X-Company-ID")
    request.company = resolve_request_company(request.user, company_id)
    return request.company


def user_is_company_member(user, company: Company) -> bool:
    return CompanyMembership.objects.filter(
        company=company,
        user=user,
        is_active=True,
        is_deleted=False,
    ).exists()


def user_is_company_owner(user, company: Company) -> bool:
    return company.owner_id == user.id or CompanyMembership.objects.filter(
        company=company,
        user=user,
        role=CompanyRole.OWNER,
        is_active=True,
        is_deleted=False,
    ).exists()


def get_user_company_role(user, company: Company) -> str | None:
    if not user or not user.is_authenticated:
        return None
    if company.owner_id == user.id:
        return CompanyRole.OWNER
    membership = CompanyMembership.objects.filter(
        company=company,
        user=user,
        is_active=True,
        is_deleted=False,
    ).first()
    return membership.role if membership else None


def user_has_company_permission(user, company: Company, permission: str) -> bool:
    role = get_user_company_role(user, company)
    if not role:
        return False
    return role_has_permission(role, permission)


def get_role_permissions(role: str) -> list[str]:
    return sorted(ROLE_PERMISSIONS.get(role, set()))


def advance_onboarding(company: Company, next_step: str) -> Company:
    company.onboarding_step = next_step
    company.save(update_fields=["onboarding_step", "updated_at"])
    return company


def complete_onboarding(company: Company) -> Company:
    from django.utils import timezone

    company.onboarding_step = OnboardingStep.COMPLETE
    company.onboarding_completed_at = timezone.now()
    company.save(update_fields=["onboarding_step", "onboarding_completed_at", "updated_at"])
    return company


def change_company_plan(company: Company, plan_code: str) -> Company:
    """Switch company subscription tier. Payment collection is stubbed for MVP."""
    from apps.companies.invitation_services import get_company_seat_usage
    from apps.companies.models import SubscriptionPlan
    from apps.core.exceptions import AmaniBuildAPIException
    from apps.projects.services import get_company_project_count

    plan = SubscriptionPlan.objects.filter(code=plan_code, is_active=True).first()
    if not plan:
        raise AmaniBuildAPIException("Invalid subscription plan.", code="invalid_plan")

    if company.plan_id == plan.id:
        raise AmaniBuildAPIException("You are already on this plan.", code="plan_unchanged")

    project_count = get_company_project_count(company)
    if project_count > plan.max_projects:
        raise AmaniBuildAPIException(
            f"Cannot switch to {plan.name}: you have {project_count} projects but this plan "
            f"allows {plan.max_projects}. Archive projects first.",
            code="plan_downgrade_blocked",
        )

    seat_usage = get_company_seat_usage(company)
    if seat_usage > plan.max_users:
        raise AmaniBuildAPIException(
            f"Cannot switch to {plan.name}: you have {seat_usage} seats in use but this plan "
            f"allows {plan.max_users}. Remove members or pending invites first.",
            code="plan_downgrade_blocked",
        )

    company.plan = plan
    company.save(update_fields=["plan", "updated_at"])
    return company
