import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, OnboardingStep, SubscriptionPlan


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_user(db):
    user = User.objects.create_user(
        email="owner@simba.co.ke",
        password="SecurePass123!",
        first_name="John",
        last_name="Mwangi",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )
    return user


@pytest.fixture
def auth_client(api_client, authenticated_user):
    from rest_framework_simplejwt.tokens import RefreshToken

    token = RefreshToken.for_user(authenticated_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return api_client


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


@pytest.mark.django_db
def test_subscription_plans_public(api_client, plans):
    response = api_client.get(reverse("subscription-plans"))
    assert response.status_code == 200
    assert len(response.data["data"]["plans"]) >= 1


@pytest.mark.django_db
def test_onboarding_flow(auth_client, authenticated_user, plans):
    status = auth_client.get(reverse("onboarding-status"))
    assert status.status_code == 200
    assert status.data["data"]["has_company"] is False
    assert status.data["data"]["next_action"] == "create_company"

    company_resp = auth_client.post(
        reverse("onboarding-company"),
        {
            "name": "Simba Contractors Ltd",
            "county": "Nairobi",
            "city": "Westlands",
            "plan_code": "free",
        },
        format="json",
    )
    assert company_resp.status_code == 201
    company_id = company_resp.data["data"]["company"]["id"]
    assert company_resp.data["data"]["next_action"] == "create_site"

    site_resp = auth_client.post(
        reverse("onboarding-site"),
        {
            "name": "Riverside Heights Site",
            "city": "Westlands",
            "county": "Nairobi",
            "site_type": "residential",
        },
        format="json",
    )
    assert site_resp.status_code == 201
    assert site_resp.data["data"]["site"]["is_primary"] is True

    complete = auth_client.post(reverse("onboarding-complete"), format="json")
    assert complete.status_code == 200
    assert complete.data["data"]["company"]["is_onboarding_complete"] is True

    company = Company.objects.get(id=company_id)
    assert company.onboarding_step == OnboardingStep.COMPLETE
    assert company.sites.count() == 1


@pytest.mark.django_db
def test_cannot_create_duplicate_company(auth_client, plans):
    auth_client.post(
        reverse("onboarding-company"),
        {"name": "Simba Contractors Ltd", "plan_code": "free"},
        format="json",
    )
    second = auth_client.post(
        reverse("onboarding-company"),
        {"name": "Another Co", "plan_code": "free"},
        format="json",
    )
    assert second.status_code == 400
