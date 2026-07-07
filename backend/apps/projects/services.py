"""Project business logic."""

from apps.companies.models import Company, CompanyMembership, Site
from apps.core.exceptions import AmaniBuildAPIException
from apps.projects.models import Project


def get_company_project_count(company: Company) -> int:
    return Project.objects.filter(company=company, is_deleted=False).count()


def assert_can_add_project(company: Company) -> None:
    if get_company_project_count(company) >= company.plan.max_projects:
        raise AmaniBuildAPIException(
            f"Your {company.plan.name} plan allows up to {company.plan.max_projects} projects. "
            "Upgrade your plan or archive a project before creating another.",
            code="plan_project_limit",
        )


def validate_project_site(company: Company, site: Site | None) -> None:
    if site is None:
        return
    if site.company_id != company.id or site.is_deleted:
        raise AmaniBuildAPIException("Site does not belong to this company.", code="invalid_site")


def validate_project_manager(company: Company, user) -> None:
    if user is None:
        return
    is_member = CompanyMembership.objects.filter(
        company=company,
        user=user,
        is_active=True,
        is_deleted=False,
    ).exists()
    if not is_member and company.owner_id != user.id:
        raise AmaniBuildAPIException(
            "Project manager must be an active company member.",
            code="invalid_manager",
        )
