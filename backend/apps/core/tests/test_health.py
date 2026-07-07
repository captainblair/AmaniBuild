import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_health_check_returns_healthy(api_client):
    response = api_client.get(reverse("health-check"))
    assert response.status_code == 200
    assert response.data["success"] is True
    assert response.data["checks"]["database"]["ok"] is True


def test_api_root(api_client):
    response = api_client.get(reverse("api-root"))
    assert response.status_code == 200
    assert response.data["success"] is True
    assert response.data["version"] == "v1"
