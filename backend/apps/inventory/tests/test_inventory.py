import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
from apps.inventory.models import StockMovementType, StockStatus


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
def keeper_user(db):
    return User.objects.create_user(
        email="keeper@simba.co.ke",
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
        {"name": "Riverside Heights", "city": "Ruiru", "county": "Kiambu"},
        format="json",
    )
    client.post(reverse("onboarding-complete"), format="json")
    return client


@pytest.fixture
def site_and_keeper(owner_client, keeper_user):
    company = Company.objects.get(name="Simba Contractors Ltd")
    site = company.sites.first()
    CompanyMembership.objects.create(company=company, user=keeper_user, role=CompanyRole.STORE_KEEPER)
    return site, _auth_client(keeper_user)


@pytest.mark.django_db
def test_create_item_and_stock_movements(site_and_keeper):
    site, keeper_client = site_and_keeper
    create = keeper_client.post(
        reverse("inventory-item-list"),
        {
            "site_id": str(site.id),
            "name": "Cement OPC 32.5",
            "sku": "CEM-325",
            "category": "cement",
            "unit": "bags",
            "quantity_on_hand": "100",
            "reorder_level": "100",
            "unit_cost": "800",
        },
        format="json",
    )
    assert create.status_code == 201
    item_id = create.data["data"]["item"]["id"]
    assert create.data["data"]["item"]["stock_status"] == StockStatus.ON_TRACK

    stock_in = keeper_client.post(
        reverse("inventory-stock-in", args=[item_id]),
        {"quantity": "145"},
        format="json",
    )
    assert stock_in.status_code == 201
    assert stock_in.data["data"]["item"]["quantity_on_hand"] == "245.00"

    stock_out = keeper_client.post(
        reverse("inventory-stock-out", args=[item_id]),
        {"quantity": "45", "movement_type": "stock_out"},
        format="json",
    )
    assert stock_out.status_code == 201
    assert stock_out.data["data"]["item"]["quantity_on_hand"] == "200.00"


@pytest.mark.django_db
def test_low_stock_status_and_dashboard(site_and_keeper, owner_client):
    site, keeper_client = site_and_keeper
    create = keeper_client.post(
        reverse("inventory-item-list"),
        {
            "site_id": str(site.id),
            "name": "Rebar 16mm",
            "category": "steel",
            "unit": "tonnes",
            "quantity_on_hand": "1.2",
            "reorder_level": "2",
            "unit_cost": "120000",
        },
        format="json",
    )
    item_id = create.data["data"]["item"]["id"]
    detail = keeper_client.get(reverse("inventory-item-detail", args=[item_id]))
    assert detail.data["data"]["item"]["stock_status"] == StockStatus.LOW_STOCK

    dashboard = owner_client.get(reverse("inventory-dashboard"), {"site_id": str(site.id)})
    assert dashboard.status_code == 200
    assert dashboard.data["data"]["dashboard"]["low_stock_alerts"] >= 1


@pytest.mark.django_db
def test_insufficient_stock_out(site_and_keeper):
    site, keeper_client = site_and_keeper
    create = keeper_client.post(
        reverse("inventory-item-list"),
        {
            "site_id": str(site.id),
            "name": "Sand",
            "unit": "tonnes",
            "quantity_on_hand": "5",
            "reorder_level": "5",
        },
        format="json",
    )
    item_id = create.data["data"]["item"]["id"]
    response = keeper_client.post(
        reverse("inventory-stock-out", args=[item_id]),
        {"quantity": "10"},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["error"]["code"] == "insufficient_stock"


@pytest.mark.django_db
def test_list_status_counts(site_and_keeper):
    site, keeper_client = site_and_keeper
    keeper_client.post(
        reverse("inventory-item-list"),
        {
            "site_id": str(site.id),
            "name": "Timber",
            "unit": "pieces",
            "quantity_on_hand": "180",
            "reorder_level": "200",
        },
        format="json",
    )
    listing = keeper_client.get(reverse("inventory-item-list"))
    assert listing.status_code == 200
    assert listing.data["status_counts"]["at_risk"] >= 1


@pytest.mark.django_db
def test_movement_history(site_and_keeper):
    site, keeper_client = site_and_keeper
    create = keeper_client.post(
        reverse("inventory-item-list"),
        {
            "site_id": str(site.id),
            "name": "Cement OPC 32.5",
            "unit": "bags",
            "quantity_on_hand": "50",
            "reorder_level": "100",
        },
        format="json",
    )
    item_id = create.data["data"]["item"]["id"]
    keeper_client.post(reverse("inventory-stock-in", args=[item_id]), {"quantity": "25"}, format="json")

    history = keeper_client.get(reverse("inventory-item-movements", args=[item_id]))
    assert history.status_code == 200
    assert len(history.data["data"]["movements"]) == 1
    assert history.data["data"]["movements"][0]["movement_type"] == StockMovementType.STOCK_IN
