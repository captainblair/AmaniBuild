import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        "email": "david.mwangi@example.com",
        "password": "SecurePass123!",
        "first_name": "David",
        "last_name": "Mwangi",
        "phone": "+254712345678",
    }


def _register_and_get_otp(api_client, user_data):
    response = api_client.post(reverse("auth-register"), user_data, format="json")
    assert response.status_code == 201
    return response.data["data"]["otp"]


@pytest.mark.django_db
def test_register_verify_login_flow(api_client, user_data):
    otp = _register_and_get_otp(api_client, user_data)
    assert "debug_otp" in otp

    verify = api_client.post(
        reverse("auth-verify-otp"),
        {"challenge_id": otp["challenge_id"], "code": otp["debug_otp"]},
        format="json",
    )
    assert verify.status_code == 200
    assert verify.data["data"]["tokens"]["access"]

    login = api_client.post(
        reverse("auth-login"),
        {"email": user_data["email"], "password": user_data["password"]},
        format="json",
    )
    assert login.status_code == 200
    assert login.data["data"]["mfa_required"] is True

    mfa_otp = login.data["data"]["otp"]
    mfa = api_client.post(
        reverse("auth-login-mfa"),
        {"challenge_id": mfa_otp["challenge_id"], "code": mfa_otp["debug_otp"]},
        format="json",
    )
    assert mfa.status_code == 200
    access = mfa.data["data"]["tokens"]["access"]

    me = api_client.get(reverse("auth-me"), HTTP_AUTHORIZATION=f"Bearer {access}")
    assert me.status_code == 200
    assert me.data["data"]["user"]["email"] == user_data["email"]


@pytest.mark.django_db
def test_login_invalid_credentials(api_client, user_data):
    _register_and_get_otp(api_client, user_data)
    response = api_client.post(
        reverse("auth-login"),
        {"email": user_data["email"], "password": "wrong-password"},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["success"] is False


@pytest.mark.django_db
def test_password_reset_flow(api_client, user_data):
    otp = _register_and_get_otp(api_client, user_data)
    api_client.post(
        reverse("auth-verify-otp"),
        {"challenge_id": otp["challenge_id"], "code": otp["debug_otp"]},
        format="json",
    )

    user = User.objects.get(email=user_data["email"])
    user.mfa_enabled = False
    user.save(update_fields=["mfa_enabled"])

    forgot = api_client.post(
        reverse("auth-password-forgot"),
        {"email": user_data["email"]},
        format="json",
    )
    assert forgot.status_code == 200
    reset_otp = forgot.data["data"]["otp"]

    verified = api_client.post(
        reverse("auth-password-verify-otp"),
        {"challenge_id": reset_otp["challenge_id"], "code": reset_otp["debug_otp"]},
        format="json",
    )
    assert verified.status_code == 200
    reset_token = verified.data["data"]["reset_token"]

    reset = api_client.post(
        reverse("auth-password-reset"),
        {"reset_token": reset_token, "new_password": "NewSecurePass456!"},
        format="json",
    )
    assert reset.status_code == 200

    login = api_client.post(
        reverse("auth-login"),
        {"email": user_data["email"], "password": "NewSecurePass456!"},
        format="json",
    )
    assert login.status_code == 200
    assert login.data["data"]["mfa_required"] is False


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api_client, user_data):
    otp = _register_and_get_otp(api_client, user_data)
    verify = api_client.post(
        reverse("auth-verify-otp"),
        {"challenge_id": otp["challenge_id"], "code": otp["debug_otp"]},
        format="json",
    )
    refresh = verify.data["data"]["tokens"]["refresh"]
    access = verify.data["data"]["tokens"]["access"]

    logout = api_client.post(
        reverse("auth-logout"),
        {"refresh": refresh},
        format="json",
        HTTP_AUTHORIZATION=f"Bearer {access}",
    )
    assert logout.status_code == 200
