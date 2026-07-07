import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyRole, OnboardingStep, SubscriptionPlan
from apps.projects.models import Project, ProjectStatus


@pytest.fixture
def plans(db):
    SubscriptionPlan.objects.get_or_create(
        code="free",
        defaults={
            "name": "Free",
            "price_kes_monthly": 0,
            "max_projects": 1,
            "max_users": 5,
            "max_storage_gb": 2,
        },
    )


def _auth_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(
        email="owner@simba.co.ke",
        password="SecurePass123!",
        first_name="John",
        last_name="Mwangi",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )


@pytest.fixture
def owner_client(owner_user, plans):
    client = _auth_client(owner_user)
    client.post(
        reverse("onboarding-company"),
        {"name": "Simba Contractors Ltd", "plan_code": "free", "county": "Nairobi"},
        format="json",
    )
    client.post(
        reverse("onboarding-site"),
        {"name": "Riverside Heights", "city": "Westlands", "county": "Nairobi"},
        format="json",
    )
    client.post(reverse("onboarding-complete"), format="json")
    return client


@pytest.fixture
def company(owner_client):
    return Company.objects.get(name="Simba Contractors Ltd")


@pytest.fixture
def site(company):
    return company.sites.filter(is_deleted=False).first()


@pytest.mark.django_db
def test_create_and_list_projects(owner_client, site):
    create = owner_client.post(
        reverse("project-list"),
        {
            "name": "Riverside Heights Phase 1",
            "code": "RH-01",
            "site_id": str(site.id),
            "budget_total": "15000000.00",
            "status": ProjectStatus.PLANNING,
            "planned_start_date": "2026-01-15",
            "planned_end_date": "2026-12-31",
        },
        format="json",
    )
    assert create.status_code == 201
    assert create.data["data"]["project"]["name"] == "Riverside Heights Phase 1"
    assert create.data["data"]["project"]["site"]["name"] == "Riverside Heights"

    listing = owner_client.get(reverse("project-list"))
    assert listing.status_code == 200
    assert listing.data["pagination"]["count"] == 1
    assert listing.data["results"][0]["name"] == "Riverside Heights Phase 1"


@pytest.mark.django_db
def test_project_overview(owner_client, site):
    create = owner_client.post(
        reverse("project-list"),
        {
            "name": "Riverside Heights Phase 1",
            "site_id": str(site.id),
            "budget_total": "10000000.00",
            "budget_spent": "2500000.00",
            "progress_percent": 25,
        },
        format="json",
    )
    project_id = create.data["data"]["project"]["id"]

    overview = owner_client.get(reverse("project-overview", args=[project_id]))
    assert overview.status_code == 200
    assert overview.data["data"]["summary"]["progress_percent"] == 25
    assert overview.data["data"]["summary"]["budget_utilization_percent"] == 25.0


@pytest.mark.django_db
def test_plan_project_limit(owner_client, site):
    owner_client.post(
        reverse("project-list"),
        {"name": "First Project", "site_id": str(site.id)},
        format="json",
    )
    second = owner_client.post(
        reverse("project-list"),
        {"name": "Second Project", "site_id": str(site.id)},
        format="json",
    )
    assert second.status_code == 400
    assert second.data["error"]["code"] == "plan_project_limit"


@pytest.mark.django_db
def test_update_and_archive_project(owner_client, site):
    create = owner_client.post(
        reverse("project-list"),
        {"name": "Riverside Heights Phase 1", "site_id": str(site.id)},
        format="json",
    )
    project_id = create.data["data"]["project"]["id"]

    patch = owner_client.patch(
        reverse("project-detail", args=[project_id]),
        {"status": ProjectStatus.ACTIVE, "progress_percent": 10},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.data["data"]["project"]["status"] == ProjectStatus.ACTIVE

    delete = owner_client.delete(reverse("project-detail", args=[project_id]))
    assert delete.status_code == 200
    assert Project.all_objects.filter(id=project_id, is_deleted=True).exists()


@pytest.mark.django_db
def test_site_crud(owner_client, company):
    create = owner_client.post(
        reverse("company-sites"),
        {
            "name": "Karen Office Park",
            "city": "Karen",
            "county": "Nairobi",
            "code": "KOP-01",
        },
        format="json",
    )
    assert create.status_code == 201
    site_id = create.data["data"]["site"]["id"]

    detail = owner_client.get(reverse("company-site-detail", args=[site_id]))
    assert detail.status_code == 200
    assert detail.data["data"]["site"]["project_count"] == 0

    patch = owner_client.patch(
        reverse("company-site-detail", args=[site_id]),
        {"status": "active"},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.data["data"]["site"]["status"] == "active"


@pytest.mark.django_db
def test_worker_cannot_create_project(owner_client, site, company):
    worker = User.objects.create_user(
        email="worker@simba.co.ke",
        password="SecurePass123!",
        first_name="Peter",
        last_name="Otieno",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )
    from apps.companies.models import CompanyMembership

    CompanyMembership.objects.create(
        company=company,
        user=worker,
        role=CompanyRole.WORKER,
    )
    worker_client = _auth_client(worker)

    denied = worker_client.post(
        reverse("project-list"),
        {"name": "Unauthorized Project", "site_id": str(site.id)},
        format="json",
    )
    assert denied.status_code == 403

    allowed = worker_client.get(reverse("project-list"))
    assert allowed.status_code == 200
