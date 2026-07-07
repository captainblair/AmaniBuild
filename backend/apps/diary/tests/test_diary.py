import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
from apps.diary.models import DiaryEntryStatus, SiteDiaryEntry


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
def engineer_user(db):
    return User.objects.create_user(
        email="engineer@simba.co.ke",
        password="SecurePass123!",
        first_name="Brian",
        last_name="Otieno",
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
        {"name": "Greenpark Towers", "city": "Kilimani", "county": "Nairobi"},
        format="json",
    )
    client.post(reverse("onboarding-complete"), format="json")
    return client


@pytest.fixture
def project(owner_client):
    site = Company.objects.get(name="Simba Contractors Ltd").sites.first()
    response = owner_client.post(
        reverse("project-list"),
        {"name": "Greenpark Towers", "site_id": str(site.id), "budget_total": "50000000.00"},
        format="json",
    )
    return response.data["data"]["project"]


@pytest.fixture
def engineer_client(engineer_user, owner_client):
    company = Company.objects.get(name="Simba Contractors Ltd")
    CompanyMembership.objects.create(
        company=company,
        user=engineer_user,
        role=CompanyRole.SITE_ENGINEER,
        job_title="Site Engineer",
    )
    return _auth_client(engineer_user)


@pytest.mark.django_db
def test_create_diary_entry(engineer_client, project, engineer_user):
    response = engineer_client.post(
        reverse("project-diary-entries", args=[project["id"]]),
        {
            "entry_date": "2026-05-19",
            "weather_condition": "partly_cloudy",
            "weather_temperature_c": "22.0",
            "supervisor_id": str(engineer_user.id),
            "workforce_count": 62,
            "working_hours": "9.0",
            "work_description": "Foundation excavation completed on Block A.",
            "progress_percent": 62,
            "labour_activities": ["carpentry", "steel_fixing"],
            "equipment_used": ["tower_crane"],
            "materials_consumed": [
                {
                    "material": "Cement",
                    "qty_used": 120,
                    "unit": "bags",
                    "remaining_stock": 80,
                    "notes": "",
                }
            ],
            "delays": "Minor rebar delivery delay",
            "photos": [{"url": "/media/site1.jpg", "caption": "Block A progress"}],
        },
        format="json",
    )
    assert response.status_code == 201
    entry = response.data["data"]["entry"]
    assert entry["status"] == DiaryEntryStatus.DRAFT
    assert entry["progress_percent"] == 62
    assert entry["photo_count"] == 1
    assert entry["has_issues"] is True


@pytest.mark.django_db
def test_submit_and_approve_workflow(engineer_client, owner_client, project, engineer_user):
    create = engineer_client.post(
        reverse("project-diary-entries", args=[project["id"]]),
        {
            "entry_date": "2026-05-20",
            "supervisor_id": str(engineer_user.id),
            "work_description": "Formwork installation.",
            "progress_percent": 65,
        },
        format="json",
    )
    entry_id = create.data["data"]["entry"]["id"]

    submit = engineer_client.post(reverse("diary-entry-submit", args=[entry_id]), format="json")
    assert submit.status_code == 200
    assert submit.data["data"]["entry"]["status"] == DiaryEntryStatus.SUBMITTED

    patch_denied = engineer_client.patch(
        reverse("diary-entry-detail", args=[entry_id]),
        {"work_description": "Changed after submit"},
        format="json",
    )
    assert patch_denied.status_code == 400

    approve = owner_client.post(reverse("diary-entry-approve", args=[entry_id]), format="json")
    assert approve.status_code == 200
    assert approve.data["data"]["entry"]["status"] == DiaryEntryStatus.APPROVED


@pytest.mark.django_db
def test_diary_timeline_and_insights(engineer_client, owner_client, project, engineer_user):
    for day in ("2026-05-18", "2026-05-19"):
        engineer_client.post(
            reverse("project-diary-entries", args=[project["id"]]),
            {
                "entry_date": day,
                "supervisor_id": str(engineer_user.id),
                "progress_percent": 60,
                "work_description": f"Work on {day}",
            },
            format="json",
        )

    timeline = owner_client.get(reverse("project-diary-timeline", args=[project["id"]]))
    assert timeline.status_code == 200
    assert len(timeline.data["data"]["timeline"]) == 2
    assert timeline.data["data"]["insights"]["total_entries"] == 2

    insights = owner_client.get(reverse("project-diary-insights", args=[project["id"]]))
    assert insights.status_code == 200
    assert insights.data["data"]["insights"]["average_daily_progress"] == 60.0


@pytest.mark.django_db
def test_duplicate_entry_date_rejected(engineer_client, project, engineer_user):
    payload = {
        "entry_date": "2026-05-21",
        "supervisor_id": str(engineer_user.id),
        "work_description": "First entry",
    }
    engineer_client.post(
        reverse("project-diary-entries", args=[project["id"]]),
        payload,
        format="json",
    )
    second = engineer_client.post(
        reverse("project-diary-entries", args=[project["id"]]),
        payload,
        format="json",
    )
    assert second.status_code == 400
    assert second.data["error"]["code"] == "duplicate_entry"


@pytest.mark.django_db
def test_worker_cannot_create_diary(owner_client, project):
    worker = User.objects.create_user(
        email="worker@simba.co.ke",
        password="SecurePass123!",
        first_name="Peter",
        last_name="Otieno",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )
    company = Company.objects.get(name="Simba Contractors Ltd")
    CompanyMembership.objects.create(company=company, user=worker, role=CompanyRole.WORKER)

    worker_client = _auth_client(worker)
    denied = worker_client.post(
        reverse("project-diary-entries", args=[project["id"]]),
        {"entry_date": "2026-05-22", "work_description": "Unauthorized"},
        format="json",
    )
    assert denied.status_code == 403

    allowed = worker_client.get(reverse("project-diary-entries", args=[project["id"]]))
    assert allowed.status_code == 200
