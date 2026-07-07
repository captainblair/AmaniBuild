import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan, TeamInvitation


@pytest.fixture
def api_client():
    return APIClient()


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
def invitee_user(db):
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
def owner_client(owner_user):
    return _auth_client(owner_user)


@pytest.fixture
def onboarded_company(owner_client, plans):
    owner_client.post(
        reverse("onboarding-company"),
        {"name": "Simba Contractors Ltd", "plan_code": "free", "county": "Nairobi"},
        format="json",
    )
    owner_client.post(
        reverse("onboarding-site"),
        {"name": "Riverside Heights", "city": "Westlands", "county": "Nairobi"},
        format="json",
    )
    return Company.objects.get(name="Simba Contractors Ltd")


@pytest.mark.django_db
def test_invite_accept_and_list_members(owner_client, onboarded_company, invitee_user):
    invite_resp = owner_client.post(
        reverse("company-invitations"),
        {
            "email": "pm@simba.co.ke",
            "role": CompanyRole.PROJECT_MANAGER,
            "job_title": "Project Manager",
        },
        format="json",
    )
    assert invite_resp.status_code == 201
    token = invite_resp.data["data"]["invitation"]["invite_token"]

    preview = APIClient().get(reverse("invitation-preview"), {"token": token})
    assert preview.status_code == 200
    assert preview.data["data"]["company_name"] == "Simba Contractors Ltd"

    invitee_client = _auth_client(invitee_user)
    accept = invitee_client.post(
        reverse("invitation-accept"),
        {"token": token},
        format="json",
    )
    assert accept.status_code == 200
    assert accept.data["data"]["membership"]["role"] == CompanyRole.PROJECT_MANAGER

    members = owner_client.get(reverse("company-members"))
    assert members.status_code == 200
    emails = {m["user_email"] for m in members.data["data"]["members"]}
    assert "owner@simba.co.ke" in emails
    assert "pm@simba.co.ke" in emails


@pytest.mark.django_db
def test_onboarding_complete_requires_invite_step(owner_client, onboarded_company):
    complete = owner_client.post(reverse("onboarding-complete"), format="json")
    assert complete.status_code == 200
    onboarded_company.refresh_from_db()
    assert onboarded_company.is_onboarding_complete


@pytest.mark.django_db
def test_cannot_invite_owner_role(owner_client, onboarded_company):
    response = owner_client.post(
        reverse("company-invitations"),
        {"email": "bad@example.com", "role": CompanyRole.OWNER},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["error"]["code"] == "invalid_role"


@pytest.mark.django_db
def test_revoke_invitation(owner_client, onboarded_company):
    create = owner_client.post(
        reverse("company-invitations"),
        {"email": "temp@example.com", "role": CompanyRole.WORKER},
        format="json",
    )
    invitation_id = create.data["data"]["invitation"]["id"]
    revoke = owner_client.delete(reverse("company-invitation-detail", args=[invitation_id]))
    assert revoke.status_code == 200
    invitation = TeamInvitation.objects.get(id=invitation_id)
    assert invitation.status == "revoked"


@pytest.mark.django_db
def test_assignable_roles_for_owner(owner_client, onboarded_company):
    response = owner_client.get(reverse("company-roles"))
    assert response.status_code == 200
    roles = {item["value"] for item in response.data["data"]["roles"]}
    assert CompanyRole.PROJECT_MANAGER in roles
    assert CompanyRole.OWNER not in roles


@pytest.mark.django_db
def test_worker_cannot_invite(owner_client, onboarded_company):
    create = owner_client.post(
        reverse("company-invitations"),
        {"email": "worker@simba.co.ke", "role": CompanyRole.WORKER},
        format="json",
    )
    token = create.data["data"]["invitation"]["invite_token"]

    worker_user = User.objects.create_user(
        email="worker@simba.co.ke",
        password="SecurePass123!",
        first_name="Peter",
        last_name="Otieno",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )
    worker_client = _auth_client(worker_user)
    worker_client.post(reverse("invitation-accept"), {"token": token}, format="json")

    denied = worker_client.post(
        reverse("company-invitations"),
        {"email": "x@example.com", "role": CompanyRole.WORKER},
        format="json",
    )
    assert denied.status_code == 403


@pytest.mark.django_db
def test_me_includes_company_context(owner_client, onboarded_company, owner_user):
    response = owner_client.get(reverse("auth-me"))
    assert response.status_code == 200
    assert "companies" in response.data["data"]
    assert len(response.data["data"]["companies"]) == 1
    assert response.data["data"]["companies"][0]["role"] == CompanyRole.OWNER
    assert "manage_team" in response.data["data"]["companies"][0]["permissions"]
