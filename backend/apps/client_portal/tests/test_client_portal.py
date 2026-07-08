import pytest
from django.urls import reverse
from django.utils import timezone
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
def client_user(db):
    return User.objects.create_user(
        email="client@greenpark.co.ke",
        password="SecurePass123!",
        first_name="Grace",
        last_name="Wanjiru",
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
def company(owner_client):
    return Company.objects.get(name="Simba Contractors Ltd")


@pytest.fixture
def project(owner_client, company):
    site = company.sites.filter(is_deleted=False).first()
    response = owner_client.post(
        reverse("project-list"),
        {
            "name": "Greenpark Towers Phase 2",
            "code": "GP-02",
            "site_id": str(site.id),
            "budget_total": "22000000.00",
            "budget_spent": "9800000.00",
            "progress_percent": 54,
            "planned_end_date": "2026-11-30",
            "client_name": "Grace Wanjiru",
            "client_email": "client@greenpark.co.ke",
        },
        format="json",
    )
    return response.data["data"]["project"]


@pytest.fixture
def client_membership(company, client_user):
    return CompanyMembership.objects.create(
        company=company,
        user=client_user,
        role=CompanyRole.CLIENT,
        is_active=True,
    )


@pytest.fixture
def client_client(client_user, client_membership, company):
    client = _auth_client(client_user)
    client.credentials(
        HTTP_AUTHORIZATION=client._credentials.get("HTTP_AUTHORIZATION"),
        HTTP_X_COMPANY_ID=str(company.id),
    )
    return client


@pytest.fixture
def granted_access(owner_client, project, client_user, client_membership):
    return owner_client.post(
        reverse("project-client-access", args=[project["id"]]),
        {"client_user_id": str(client_user.id), "can_view_budget": False},
        format="json",
    )


@pytest.mark.django_db
def test_grant_and_list_client_access(owner_client, project, client_user, client_membership):
    grant = owner_client.post(
        reverse("project-client-access", args=[project["id"]]),
        {"client_user_id": str(client_user.id), "can_view_budget": False},
        format="json",
    )
    assert grant.status_code == 201
    assert grant.data["data"]["access_grant"]["client_user_email"] == "client@greenpark.co.ke"
    assert grant.data["data"]["access_grant"]["can_view_budget"] is False

    listing = owner_client.get(reverse("project-client-access", args=[project["id"]]))
    assert listing.status_code == 200
    assert len(listing.data["data"]["access_grants"]) == 1


@pytest.mark.django_db
def test_client_portal_progress_view(client_client, project, granted_access):
    dashboard = client_client.get(reverse("client-portal-dashboard"))
    assert dashboard.status_code == 200
    assert dashboard.data["data"]["dashboard"]["assigned_projects"] == 1
    assert dashboard.data["data"]["dashboard"]["average_progress"] == 54

    overview = client_client.get(reverse("client-portal-project-overview", args=[project["id"]]))
    assert overview.status_code == 200
    assert overview.data["data"]["overview"]["progress_percent"] == 54
    assert "budget" not in overview.data["data"]["overview"]

    milestones = client_client.get(reverse("client-portal-project-milestones", args=[project["id"]]))
    assert milestones.status_code == 200


@pytest.mark.django_db
def test_client_portal_timeline_and_forbidden_without_grant(client_client, owner_client, project, client_membership, company):
    blocked = client_client.get(reverse("client-portal-project-overview", args=[project["id"]]))
    assert blocked.status_code == 403

    owner_client.post(
        reverse("project-diary-entries", args=[project["id"]]),
        {
            "entry_date": timezone.localdate().isoformat(),
            "work_description": "Level 8 slab pour completed",
            "progress_percent": 54,
        },
        format="json",
    )
    entry = SiteDiaryEntry.objects.get(project_id=project["id"])
    entry.status = DiaryEntryStatus.APPROVED
    entry.save(update_fields=["status", "updated_at"])

    owner_client.post(
        reverse("project-client-access", args=[project["id"]]),
        {"client_user_id": str(client_membership.user_id), "can_view_budget": True},
        format="json",
    )

    timeline = client_client.get(reverse("client-portal-project-timeline", args=[project["id"]]))
    assert timeline.status_code == 200
    assert len(timeline.data["data"]["timeline"]) == 1
    assert "Level 8 slab pour" in timeline.data["data"]["timeline"][0]["summary"]

    revoke = owner_client.delete(
        reverse("project-client-access-revoke", args=[project["id"], client_membership.user_id])
    )
    assert revoke.status_code == 200

    blocked_again = client_client.get(reverse("client-portal-project-timeline", args=[project["id"]]))
    assert blocked_again.status_code == 403
