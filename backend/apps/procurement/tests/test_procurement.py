import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
from apps.procurement.models import PurchaseRequestStatus


@pytest.fixture
def plans(db):
    SubscriptionPlan.objects.get_or_create(
        code="free",
        defaults={"name": "Free", "max_projects": 1, "max_users": 5, "max_storage_gb": 2},
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
def pm_user(db):
    return User.objects.create_user(
        email="pm@simba.co.ke",
        password="SecurePass123!",
        first_name="Grace",
        last_name="Wanjiku",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )


@pytest.fixture
def owner_client(owner_user, plans):
    client = _auth_client(owner_user)
    client.post(
        reverse("onboarding-company"),
        {"name": "Simba Contractors Ltd", "plan_code": "free"},
        format="json",
    )
    client.post(
        reverse("onboarding-site"),
        {"name": "Riverside Heights", "city": "Westlands"},
        format="json",
    )
    client.post(reverse("onboarding-complete"), format="json")
    return client


@pytest.fixture
def project(owner_client):
    company = Company.objects.get(name="Simba Contractors Ltd")
    site = company.sites.first()
    response = owner_client.post(
        reverse("project-list"),
        {"name": "Riverside Heights Apartments", "site_id": str(site.id)},
        format="json",
    )
    return response.data["data"]["project"]


@pytest.fixture
def team(owner_client, engineer_user, pm_user):
    company = Company.objects.get(name="Simba Contractors Ltd")
    CompanyMembership.objects.create(company=company, user=engineer_user, role=CompanyRole.SITE_ENGINEER)
    CompanyMembership.objects.create(company=company, user=pm_user, role=CompanyRole.PROJECT_MANAGER)
    return _auth_client(engineer_user), _auth_client(pm_user)


def _sample_request_payload(project_id):
    return {
        "project_id": project_id,
        "title": "Cement 42.5N for Riverside Heights",
        "category": "materials",
        "justification": "Foundation works require immediate cement delivery.",
        "lines": [
            {"description": "Cement 42.5N", "quantity": "100", "unit": "bags", "unit_price": "800"},
            {"description": "Transport", "quantity": "1", "unit": "trip", "unit_price": "5000"},
        ],
        "attachments": [{"filename": "Cement_Quote_Riverside.pdf", "url": "/media/quotes/cement.pdf"}],
    }


@pytest.mark.django_db
def test_create_and_submit_purchase_request(team, project):
    engineer_client, _pm_client = team
    create = engineer_client.post(
        reverse("purchase-request-list"),
        _sample_request_payload(project["id"]),
        format="json",
    )
    assert create.status_code == 201
    request_id = create.data["data"]["request"]["id"]
    assert create.data["data"]["request"]["request_number"].startswith("PO-")
    assert create.data["data"]["request"]["total_amount"] == "85000.00"

    submit = engineer_client.post(reverse("purchase-request-submit", args=[request_id]), format="json")
    assert submit.status_code == 200
    assert submit.data["data"]["request"]["status"] == PurchaseRequestStatus.PENDING_MANAGER


@pytest.mark.django_db
def test_approval_workflow(team, project, owner_client):
    engineer_client, pm_client = team
    create = engineer_client.post(
        reverse("purchase-request-list"),
        _sample_request_payload(project["id"]),
        format="json",
    )
    request_id = create.data["data"]["request"]["id"]
    engineer_client.post(reverse("purchase-request-submit", args=[request_id]), format="json")

    manager_approve = pm_client.post(reverse("purchase-request-approve", args=[request_id]), format="json")
    assert manager_approve.status_code == 200
    assert manager_approve.data["data"]["request"]["status"] == PurchaseRequestStatus.PENDING_OWNER

    owner_approve = owner_client.post(reverse("purchase-request-approve", args=[request_id]), format="json")
    assert owner_approve.status_code == 200
    assert owner_approve.data["data"]["request"]["status"] == PurchaseRequestStatus.APPROVED

    activity = owner_client.get(reverse("purchase-request-activity", args=[request_id]))
    assert activity.status_code == 200
    assert len(activity.data["data"]["activity"]) >= 2


@pytest.mark.django_db
def test_reject_purchase_request(team, project):
    engineer_client, pm_client = team
    create = engineer_client.post(
        reverse("purchase-request-list"),
        _sample_request_payload(project["id"]),
        format="json",
    )
    request_id = create.data["data"]["request"]["id"]
    engineer_client.post(reverse("purchase-request-submit", args=[request_id]), format="json")

    reject = pm_client.post(
        reverse("purchase-request-reject", args=[request_id]),
        {"reason": "Budget exceeded for this month"},
        format="json",
    )
    assert reject.status_code == 200
    assert reject.data["data"]["request"]["status"] == PurchaseRequestStatus.REJECTED


@pytest.mark.django_db
def test_list_with_status_counts(team, project, owner_client):
    engineer_client, pm_client = team
    create = engineer_client.post(
        reverse("purchase-request-list"),
        _sample_request_payload(project["id"]),
        format="json",
    )
    request_id = create.data["data"]["request"]["id"]
    engineer_client.post(reverse("purchase-request-submit", args=[request_id]), format="json")

    listing = owner_client.get(reverse("purchase-request-list"))
    assert listing.status_code == 200
    assert listing.data["status_counts"]["pending"] >= 1


@pytest.mark.django_db
def test_engineer_cannot_approve(team, project):
    engineer_client, _pm_client = team
    create = engineer_client.post(
        reverse("purchase-request-list"),
        _sample_request_payload(project["id"]),
        format="json",
    )
    request_id = create.data["data"]["request"]["id"]
    engineer_client.post(reverse("purchase-request-submit", args=[request_id]), format="json")

    denied = engineer_client.post(reverse("purchase-request-approve", args=[request_id]), format="json")
    assert denied.status_code == 403
