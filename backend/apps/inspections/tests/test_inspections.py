import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyRole, SubscriptionPlan
from apps.inspections.models import InspectionStatus


@pytest.fixture
def plans(db):
    SubscriptionPlan.objects.get_or_create(
        code="free",
        defaults={
            "name": "Free",
            "price_kes_monthly": 0,
            "max_projects": 5,
            "max_users": 10,
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
        first_name="David",
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
def project(owner_client, company):
    site = company.sites.filter(is_deleted=False).first()
    response = owner_client.post(
        reverse("project-list"),
        {
            "name": "Riverside Heights Apartments",
            "code": "RH-01",
            "site_id": str(site.id),
            "budget_total": "15000000.00",
            "budget_spent": "6400000.00",
            "progress_percent": 68,
            "planned_end_date": "2026-12-31",
        },
        format="json",
    )
    return response.data["data"]["project"]


def _complete_checklist(owner_client, inspection_id, checklist_items):
    completed = []
    for item in checklist_items:
        completed.append({**item, "status": "pass"})
    owner_client.patch(
        reverse("inspection-detail", args=[inspection_id]),
        {"checklist_items": completed},
        format="json",
    )


@pytest.mark.django_db
def test_inspection_templates_and_dashboard(owner_client, project):
    templates = owner_client.get(reverse("inspection-templates"))
    assert templates.status_code == 200
    assert len(templates.data["data"]["templates"]) >= 6

    dashboard = owner_client.get(reverse("inspection-dashboard"))
    assert dashboard.status_code == 200
    assert dashboard.data["data"]["dashboard"]["total_inspections"] == 0


@pytest.mark.django_db
def test_inspection_workflow(owner_client, project):
    create = owner_client.post(
        reverse("project-inspection-list", args=[project["id"]]),
        {
            "title": "Level 5 structural QA",
            "inspection_type": "structural",
            "area_location": "Block A — Level 5",
            "scheduled_date": timezone.localdate().isoformat(),
            "use_template": True,
        },
        format="json",
    )
    assert create.status_code == 201
    inspection = create.data["data"]["inspection"]
    assert inspection["inspection_number"].startswith("INS-")
    assert inspection["status"] == InspectionStatus.SCHEDULED
    assert len(inspection["checklist_items"]) >= 3

    started = owner_client.post(reverse("inspection-start", args=[inspection["id"]]))
    assert started.status_code == 200
    assert started.data["data"]["inspection"]["status"] == InspectionStatus.IN_PROGRESS

    _complete_checklist(owner_client, inspection["id"], inspection["checklist_items"])

    submitted = owner_client.post(reverse("inspection-submit", args=[inspection["id"]]))
    assert submitted.status_code == 200
    assert submitted.data["data"]["inspection"]["status"] == InspectionStatus.SUBMITTED
    assert submitted.data["data"]["inspection"]["score_percent"] == 100

    reviewed = owner_client.post(
        reverse("inspection-review", args=[inspection["id"]]),
        {"result": "pass", "notes": "All structural checks verified."},
        format="json",
    )
    assert reviewed.status_code == 200
    assert reviewed.data["data"]["inspection"]["status"] == InspectionStatus.PASSED
    assert reviewed.data["data"]["inspection"]["result"] == "pass"

    dashboard = owner_client.get(
        reverse("inspection-dashboard"),
        {"project_id": project["id"]},
    )
    assert dashboard.data["data"]["dashboard"]["by_status"]["passed"] == 1
