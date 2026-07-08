from datetime import time

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
from apps.procurement.models import PurchaseCategory, PurchaseRequest, PurchaseRequestStatus


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
def worker_user(db):
    return User.objects.create_user(
        email="worker@simba.co.ke",
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


@pytest.fixture
def seeded_project_data(owner_client, company, project, worker_user):
    CompanyMembership.objects.create(company=company, user=worker_user, role=CompanyRole.WORKER, is_active=True)

    owner_client.post(
        reverse("project-attendance-assignments", args=[project["id"]]),
        {
            "worker_id": str(worker_user.id),
            "trade": "mason",
            "employee_code": "AB-W-2458",
            "shift_start_time": "07:00:00",
            "shift_end_time": "17:00:00",
        },
        format="json",
    )

    worker_client = _auth_client(worker_user)
    worker_client.post(
        reverse("attendance-clock"),
        {"project_id": project["id"], "event_type": "check_in", "method": "mobile"},
        format="json",
    )
    worker_client.post(
        reverse("attendance-clock"),
        {"project_id": project["id"], "event_type": "check_out", "method": "mobile"},
        format="json",
    )

    owner_client.post(
        reverse("project-diary-entries", args=[project["id"]]),
        {
            "entry_date": timezone.localdate().isoformat(),
            "work_description": "Formwork and concrete prep",
            "progress_percent": 68,
            "safety_concerns": "Minor PPE non-compliance",
            "required_actions": "Toolbox talk",
        },
        format="json",
    )

    owner_client.post(
        reverse("project-task-list", args=[project["id"]]),
        {
            "title": "Level 5 formwork",
            "priority": "high",
            "assignee_id": str(worker_user.id),
        },
        format="json",
    )

    site = company.sites.filter(is_deleted=False).first()
    item = owner_client.post(
        reverse("inventory-item-list"),
        {
            "site_id": str(site.id),
            "project_id": project["id"],
            "name": "Cement OPC 32.5",
            "sku": "CEM-325",
            "category": "cement",
            "unit": "bags",
            "quantity_on_hand": "70",
            "reorder_level": "100",
            "unit_cost": "800",
        },
        format="json",
    )
    item_id = item.data["data"]["item"]["id"]
    owner_client.post(
        reverse("inventory-stock-out", args=[item_id]),
        {"quantity": "5", "movement_type": "stock_out"},
        format="json",
    )

    PurchaseRequest.objects.create(
        company=company,
        project_id=project["id"],
        request_number="PR-001",
        title="Electrical conduit materials",
        category=PurchaseCategory.MATERIALS,
        status=PurchaseRequestStatus.APPROVED,
        total_amount="85000.00",
        requested_by=worker_user,
        approved_at=timezone.now(),
    )


@pytest.mark.django_db
def test_report_templates_and_portfolio_analytics(owner_client, seeded_project_data):
    templates = owner_client.get(reverse("report-templates"))
    assert templates.status_code == 200
    assert len(templates.data["data"]["templates"]) >= 6

    analytics = owner_client.get(reverse("portfolio-analytics"))
    assert analytics.status_code == 200
    assert analytics.data["data"]["analytics"]["total_projects"] >= 1
    assert analytics.data["data"]["analytics"]["inventory_low_stock_alerts"] >= 1


@pytest.mark.django_db
def test_project_analytics_and_generate_report(owner_client, project, seeded_project_data):
    progress = owner_client.get(
        reverse("project-analytics", args=[project["id"]]),
        {"report_type": "progress"},
    )
    assert progress.status_code == 200
    assert progress.data["data"]["analytics"]["executive_summary"]["overall_progress"] == 68

    material_usage = owner_client.get(
        reverse("project-analytics", args=[project["id"]]),
        {"report_type": "material_usage"},
    )
    assert material_usage.status_code == 200
    assert material_usage.data["data"]["analytics"]["inventory"]["low_stock_alerts"] >= 1

    generated = owner_client.post(
        reverse("generated-report-list"),
        {
            "report_type": "progress",
            "title": "Progress Report - Riverside Heights",
            "project_id": project["id"],
        },
        format="json",
    )
    assert generated.status_code == 201
    report_id = generated.data["data"]["report"]["id"]

    detail = owner_client.get(reverse("generated-report-detail", args=[report_id]))
    assert detail.status_code == 200
    assert detail.data["data"]["report"]["title"] == "Progress Report - Riverside Heights"

