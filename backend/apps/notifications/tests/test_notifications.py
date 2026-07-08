import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
from apps.documents.models import LibraryAssetType, LibraryDocumentType
from apps.notifications.models import NotificationCategory, NotificationPriority
from apps.notifications.services import create_notification, record_activity_event
from apps.procurement.models import PurchaseCategory, PurchaseRequest, PurchaseRequestStatus
from apps.projects.models import Project


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
def engineer_user(db):
    return User.objects.create_user(
        email="brian@simba.co.ke",
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
        },
        format="json",
    )
    return Project.objects.get(id=response.data["data"]["project"]["id"])


@pytest.mark.django_db
def test_notification_list_summary_and_read(owner_client, company, project, owner_user, engineer_user):
    create_notification(
        company=company,
        recipient=owner_user,
        project=project,
        actor=engineer_user,
        category=NotificationCategory.CRITICAL,
        priority=NotificationPriority.HIGH,
        title="Safety incident reported",
        body="Worker reported a hand injury at Riverside Heights Apartments.",
    )
    create_notification(
        company=company,
        recipient=owner_user,
        category=NotificationCategory.MENTION,
        title="Peter Ochieng mentioned you in Site Diary #245",
        body="Please review the safety note.",
    )

    listing = owner_client.get(reverse("notification-list"))
    assert listing.status_code == 200
    assert listing.data["pagination"]["count"] == 2
    assert listing.data["summary"]["unread_total"] == 2
    assert listing.data["summary"]["critical"] == 1

    notification_id = listing.data["results"][0]["id"]
    read = owner_client.post(reverse("notification-read", kwargs={"notification_id": notification_id}))
    assert read.status_code == 200
    assert read.data["data"]["notification"]["is_read"] is True

    read_all = owner_client.post(reverse("notification-read-all"))
    assert read_all.status_code == 200
    assert read_all.data["data"]["summary"]["unread_total"] == 0


@pytest.mark.django_db
def test_sync_approval_notifications(owner_client, company, project, engineer_user):
    PurchaseRequest.objects.create(
        company=company,
        project=project,
        request_number="PR-001",
        title="Electrical conduit materials",
        category=PurchaseCategory.MATERIALS,
        status=PurchaseRequestStatus.PENDING_MANAGER,
        total_amount="85000.00",
        requested_by=engineer_user,
        submitted_at=timezone.now(),
    )

    response = owner_client.get(reverse("notification-list"), {"category": "approval"})
    assert response.status_code == 200
    assert response.data["pagination"]["count"] >= 1
    assert response.data["results"][0]["category"] == NotificationCategory.APPROVAL


@pytest.mark.django_db
def test_activity_timeline(owner_client, company, project, owner_user):
    owner_client.post(
        reverse("library-list"),
        {
            "title": "Method Statement — Concrete Works",
            "asset_type": LibraryAssetType.DOCUMENT,
            "document_type": LibraryDocumentType.REPORT,
            "project_id": str(project.id),
            "file_extension": "pdf",
            "size_bytes": 1200000,
            "file_url": "https://example.com/method-statement.pdf",
        },
        format="json",
    )
    record_activity_event(
        company=company,
        project=project,
        actor=owner_user,
        event_type="budget",
        title="Budget milestone reached",
        summary="KES 2.4M spent",
        metadata={"amount": "2400000"},
    )

    timeline = owner_client.get(reverse("activity-timeline"), {"project_id": str(project.id)})
    assert timeline.status_code == 200
    titles = [item["title"] for item in timeline.data["data"]["timeline"]]
    assert any("Document uploaded" in title for title in titles)
    assert any("Budget milestone reached" in title for title in titles)
