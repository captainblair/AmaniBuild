import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, SubscriptionPlan
from apps.expenses.models import ExpenseStatus


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


RECEIPT = [{"url": "https://cdn.example.com/receipts/fuel-001.jpg", "filename": "fuel-001.jpg"}]


@pytest.mark.django_db
def test_expense_dashboard(owner_client, project):
    dashboard = owner_client.get(reverse("expense-dashboard"))
    assert dashboard.status_code == 200
    assert dashboard.data["data"]["dashboard"]["total_expenses"] == 0


@pytest.mark.django_db
def test_expense_workflow(owner_client, project):
    create = owner_client.post(
        reverse("project-expense-list", args=[project["id"]]),
        {
            "title": "Site fuel purchase",
            "category": "fuel",
            "amount": "4500.00",
            "expense_date": timezone.localdate().isoformat(),
            "vendor_name": "Total Energies Kilimani",
            "payment_method": "mpesa",
            "reference_number": "QHK7X2ABCD",
            "receipt_photos": RECEIPT,
        },
        format="json",
    )
    assert create.status_code == 201
    expense = create.data["data"]["expense"]
    assert expense["expense_number"].startswith("EXP-")
    assert expense["status"] == ExpenseStatus.DRAFT

    submitted = owner_client.post(reverse("expense-submit", args=[expense["id"]]))
    assert submitted.status_code == 200
    assert submitted.data["data"]["expense"]["status"] == ExpenseStatus.SUBMITTED

    approved = owner_client.post(reverse("expense-approve", args=[expense["id"]]))
    assert approved.status_code == 200
    assert approved.data["data"]["expense"]["status"] == ExpenseStatus.APPROVED

    reimbursed = owner_client.post(reverse("expense-reimburse", args=[expense["id"]]))
    assert reimbursed.status_code == 200
    assert reimbursed.data["data"]["expense"]["status"] == ExpenseStatus.REIMBURSED

    dashboard = owner_client.get(
        reverse("expense-dashboard"),
        {"project_id": project["id"]},
    )
    assert dashboard.data["data"]["dashboard"]["by_status"]["reimbursed"] == 1


@pytest.mark.django_db
def test_expense_submit_requires_receipt(owner_client, project):
    create = owner_client.post(
        reverse("project-expense-list", args=[project["id"]]),
        {
            "title": "Missing receipt expense",
            "amount": "1200.00",
            "expense_date": timezone.localdate().isoformat(),
        },
        format="json",
    )
    expense_id = create.data["data"]["expense"]["id"]
    submit = owner_client.post(reverse("expense-submit", args=[expense_id]))
    assert submit.status_code == 400
    assert submit.data["error"]["code"] == "missing_receipt"
