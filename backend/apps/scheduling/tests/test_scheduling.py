import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, SubscriptionPlan


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
        {"name": "Skyline Residences", "city": "Westlands", "county": "Nairobi"},
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
            "name": "Skyline Residences Tower B",
            "code": "SR-B",
            "site_id": str(site.id),
            "budget_total": "18000000.00",
            "progress_percent": 42,
            "planned_start_date": "2026-01-01",
            "planned_end_date": "2026-12-31",
        },
        format="json",
    )
    return response.data["data"]["project"]


@pytest.mark.django_db
def test_schedule_phase_and_gantt(owner_client, project):
    phase = owner_client.post(
        reverse("project-schedule-phases", args=[project["id"]]),
        {"name": "Structure", "color": "#2563EB", "sort_order": 1},
        format="json",
    )
    assert phase.status_code == 201
    phase_id = phase.data["data"]["phase"]["id"]

    item_a = owner_client.post(
        reverse("project-schedule-items", args=[project["id"]]),
        {
            "title": "Foundation works",
            "phase_id": phase_id,
            "start_date": "2026-01-01",
            "end_date": "2026-02-15",
            "progress_percent": 100,
            "status": "completed",
            "is_milestone": False,
        },
        format="json",
    )
    assert item_a.status_code == 201

    item_b = owner_client.post(
        reverse("project-schedule-items", args=[project["id"]]),
        {
            "title": "Level 1 slab",
            "phase_id": phase_id,
            "start_date": "2026-02-16",
            "end_date": "2026-03-30",
            "progress_percent": 60,
            "status": "in_progress",
            "is_milestone": True,
        },
        format="json",
    )
    item_b_id = item_b.data["data"]["item"]["id"]
    item_a_id = item_a.data["data"]["item"]["id"]

    dependency = owner_client.post(
        reverse("project-schedule-dependencies", args=[project["id"]]),
        {
            "predecessor_id": item_a_id,
            "successor_id": item_b_id,
            "dependency_type": "finish_to_start",
            "lag_days": 1,
        },
        format="json",
    )
    assert dependency.status_code == 201

    gantt = owner_client.get(reverse("project-schedule-gantt", args=[project["id"]]))
    assert gantt.status_code == 200
    data = gantt.data["data"]["gantt"]
    assert len(data["phases"]) == 1
    assert len(data["items"]) == 2
    assert len(data["dependencies"]) == 1
    assert data["summary"]["milestones"] == 1

    dashboard = owner_client.get(reverse("project-schedule-dashboard", args=[project["id"]]))
    assert dashboard.status_code == 200
    assert dashboard.data["data"]["dashboard"]["total_items"] == 2


@pytest.mark.django_db
def test_schedule_item_update_and_delete(owner_client, project):
    item = owner_client.post(
        reverse("project-schedule-items", args=[project["id"]]),
        {
            "title": "MEP rough-in",
            "start_date": "2026-04-01",
            "end_date": "2026-05-15",
            "status": "not_started",
        },
        format="json",
    )
    item_id = item.data["data"]["item"]["id"]

    updated = owner_client.patch(
        reverse("schedule-item-detail", args=[item_id]),
        {"status": "delayed", "progress_percent": 10},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.data["data"]["item"]["status"] == "delayed"

    deleted = owner_client.delete(reverse("schedule-item-detail", args=[item_id]))
    assert deleted.status_code == 200

    gantt = owner_client.get(reverse("project-schedule-gantt", args=[project["id"]]))
    assert gantt.data["data"]["gantt"]["summary"]["total_items"] == 0
