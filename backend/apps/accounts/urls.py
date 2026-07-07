"""Authentication URL routes."""

from django.urls import path

from apps.accounts.views import (
    LoginMFAView,
    LoginView,
    LogoutView,
    MeView,
    PasswordForgotView,
    PasswordResetVerifyOTPView,
    PasswordResetView,
    RefreshTokenView,
    RegisterView,
    ResendOTPView,
    VerifyRegistrationOTPView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("verify-otp/", VerifyRegistrationOTPView.as_view(), name="auth-verify-otp"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("login/mfa/", LoginMFAView.as_view(), name="auth-login-mfa"),
    path("token/refresh/", RefreshTokenView.as_view(), name="auth-token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("password/forgot/", PasswordForgotView.as_view(), name="auth-password-forgot"),
    path("password/verify-otp/", PasswordResetVerifyOTPView.as_view(), name="auth-password-verify-otp"),
    path("password/reset/", PasswordResetView.as_view(), name="auth-password-reset"),
    path("otp/resend/", ResendOTPView.as_view(), name="auth-otp-resend"),
    path("me/", MeView.as_view(), name="auth-me"),
]
