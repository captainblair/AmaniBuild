import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
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
def engineer_client(engineer_user, company):
    CompanyMembership.objects.create(
        company=company,
        user=engineer_user,
        role=CompanyRole.SITE_ENGINEER,
        is_active=True,
    )
    return _auth_client(engineer_user)


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
def test_project_conversation_and_messages(owner_client, engineer_client, project, engineer_user):
    conversation = owner_client.post(reverse("project-conversation", kwargs={"project_id": project.id}))
    assert conversation.status_code == 201
    channel_id = conversation.data["data"]["conversation"]["id"]

    send = owner_client.post(
        reverse("conversation-messages", kwargs={"channel_id": channel_id}),
        {
            "body": "Concrete pour scheduled for tomorrow at 8 AM.",
            "mention_user_ids": [str(engineer_user.id)],
        },
        format="json",
    )
    assert send.status_code == 201

    listing = engineer_client.get(reverse("conversation-list"))
    assert listing.status_code == 200
    assert listing.data["pagination"]["count"] >= 1
    assert listing.data["summary"]["unread_total"] >= 1

    mentions = engineer_client.get(reverse("conversation-mentions"))
    assert mentions.status_code == 200
    assert len(mentions.data["data"]["mentions"]) >= 1

    read = engineer_client.post(reverse("conversation-read", kwargs={"channel_id": channel_id}))
    assert read.status_code == 200


@pytest.mark.django_db
def test_team_channel_files_and_announcement(owner_client, engineer_user):
    create = owner_client.post(
        reverse("conversation-list"),
        {
            "name": "Site Supervisors",
            "description": "Supervisor coordination channel",
            "member_ids": [str(engineer_user.id)],
            "pinned_announcement": "Safety briefing Friday 7:00 AM",
        },
        format="json",
    )
    assert create.status_code == 201
    channel_id = create.data["data"]["conversation"]["id"]

    message = owner_client.post(
        reverse("conversation-messages", kwargs={"channel_id": channel_id}),
        {
            "body": "Please review inspection report.",
            "attachments": [
                {
                    "name": "inspection_report_block_b.pdf",
                    "file_url": "https://example.com/inspection.pdf",
                    "file_extension": "pdf",
                    "size_bytes": 1200000,
                }
            ],
        },
        format="json",
    )
    assert message.status_code == 201

    files = owner_client.get(reverse("conversation-files", kwargs={"channel_id": channel_id}))
    assert files.status_code == 200
    assert files.data["data"]["files"][0]["name"] == "inspection_report_block_b.pdf"

    announcement = owner_client.post(
        reverse("conversation-messages", kwargs={"channel_id": channel_id}),
        {
            "body": "Mandatory safety briefing Friday 7:00 AM at site office.",
            "is_announcement": True,
        },
        format="json",
    )
    assert announcement.status_code == 201

    detail = owner_client.get(reverse("conversation-detail", kwargs={"channel_id": channel_id}))
    assert detail.status_code == 200
    assert "safety briefing" in detail.data["data"]["conversation"]["pinned_announcement"].lower()
