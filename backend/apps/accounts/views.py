"""Authentication API views."""

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from drf_spectacular.utils import extend_schema

from apps.accounts.models import OTPPurpose, User
from apps.accounts.serializers import (
    LoginMFASerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordForgotSerializer,
    PasswordResetSerializer,
    PasswordResetVerifyOTPSerializer,
    RegisterSerializer,
    ResendOTPSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)
from apps.accounts.services import (
    create_otp_challenge,
    create_password_reset_token,
    should_expose_otp_in_response,
    verify_otp_challenge,
    verify_password_reset_token,
    consume_password_reset_token,
)
from apps.accounts.throttles import AuthAnonThrottle
from apps.core.exceptions import AmaniBuildAPIException


def _issue_tokens(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    user.last_login_at = timezone.now()
    request = None  # set by caller if needed
    user.save(update_fields=["last_login_at", "updated_at"])
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "token_type": "Bearer",
        "expires_in": int(refresh.access_token.lifetime.total_seconds()),
    }


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _otp_payload(challenge, code: str) -> dict:
    payload = {
        "challenge_id": str(challenge.id),
        "purpose": challenge.purpose,
        "expires_at": challenge.expires_at.isoformat(),
        "delivery": {
            "email": challenge.email,
            "phone": challenge.phone,
        },
    }
    if should_expose_otp_in_response():
        payload["debug_otp"] = code
    return payload


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=RegisterSerializer, tags=["Auth"])
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone=data.get("phone"),
            is_active=False,
        )

        challenge, code = create_otp_challenge(
            purpose=OTPPurpose.REGISTRATION,
            user=user,
            email=user.email,
            phone=user.phone,
        )

        return _success(
            {
                "message": "Registration started. Verify the OTP sent to your email or phone.",
                "user_id": str(user.id),
                "otp": _otp_payload(challenge, code),
            },
            status.HTTP_201_CREATED,
        )


class VerifyRegistrationOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=VerifyOTPSerializer, tags=["Auth"])
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            challenge = verify_otp_challenge(
                purpose=OTPPurpose.REGISTRATION,
                code=serializer.validated_data["code"],
                challenge_id=str(serializer.validated_data["challenge_id"]),
            )
        except ValueError as exc:
            raise AmaniBuildAPIException(str(exc), code="invalid_otp") from exc

        user = challenge.user
        if not user:
            raise AmaniBuildAPIException("User not found for this challenge.", code="user_not_found")

        user.is_active = True
        user.is_email_verified = True
        if user.phone:
            user.is_phone_verified = True
        user.save(update_fields=["is_active", "is_email_verified", "is_phone_verified", "updated_at"])

        tokens = _issue_tokens(user)
        return _success(
            {
                "message": "Account verified successfully.",
                "user": UserSerializer(user).data,
                "tokens": tokens,
            }
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=LoginSerializer, tags=["Auth"])
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        if user.mfa_enabled:
            challenge, code = create_otp_challenge(
                purpose=OTPPurpose.LOGIN,
                user=user,
                email=user.email,
                phone=user.phone,
            )
            return _success(
                {
                    "mfa_required": True,
                    "message": "Enter the verification code sent to your device.",
                    "otp": _otp_payload(challenge, code),
                }
            )

        tokens = _issue_tokens(user)
        return _success(
            {
                "mfa_required": False,
                "user": UserSerializer(user).data,
                "tokens": tokens,
            }
        )


class LoginMFAView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=LoginMFASerializer, tags=["Auth"])
    def post(self, request):
        serializer = LoginMFASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            challenge = verify_otp_challenge(
                purpose=OTPPurpose.LOGIN,
                code=serializer.validated_data["code"],
                challenge_id=str(serializer.validated_data["challenge_id"]),
            )
        except ValueError as exc:
            raise AmaniBuildAPIException(str(exc), code="invalid_otp") from exc

        user = challenge.user
        if not user or not user.is_active:
            raise AmaniBuildAPIException("Invalid account.", code="invalid_account")

        tokens = _issue_tokens(user)
        return _success(
            {
                "user": UserSerializer(user).data,
                "tokens": tokens,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LogoutSerializer, tags=["Auth"])
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except Exception as exc:  # noqa: BLE001
            raise AmaniBuildAPIException("Invalid refresh token.", code="invalid_token") from exc
        return _success({"message": "Logged out successfully."})


class PasswordForgotView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=PasswordForgotSerializer, tags=["Auth"])
    def post(self, request):
        serializer = PasswordForgotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        user = User.objects.filter(email__iexact=email).first()
        if user:
            challenge, code = create_otp_challenge(
                purpose=OTPPurpose.PASSWORD_RESET,
                user=user,
                email=user.email,
                phone=user.phone,
            )
            otp_data = _otp_payload(challenge, code)
        else:
            otp_data = None

        # Uniform response — do not reveal whether email exists
        return _success(
            {
                "message": "If an account exists, a verification code has been sent.",
                "otp": otp_data,
            }
        )


class PasswordResetVerifyOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=PasswordResetVerifyOTPSerializer, tags=["Auth"])
    def post(self, request):
        serializer = PasswordResetVerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            challenge = verify_otp_challenge(
                purpose=OTPPurpose.PASSWORD_RESET,
                code=serializer.validated_data["code"],
                challenge_id=str(serializer.validated_data["challenge_id"]),
            )
        except ValueError as exc:
            raise AmaniBuildAPIException(str(exc), code="invalid_otp") from exc

        user = challenge.user
        if not user:
            raise AmaniBuildAPIException("User not found.", code="user_not_found")

        _, reset_token = create_password_reset_token(user)
        return _success(
            {
                "message": "Verification successful. Set your new password.",
                "reset_token": reset_token,
            }
        )


class PasswordResetView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=PasswordResetSerializer, tags=["Auth"])
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            record = verify_password_reset_token(serializer.validated_data["reset_token"])
        except ValueError as exc:
            raise AmaniBuildAPIException(str(exc), code="invalid_reset_token") from exc

        user = record.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        consume_password_reset_token(record)

        return _success({"message": "Password reset successfully. You can now log in."})


class ResendOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=ResendOTPSerializer, tags=["Auth"])
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.accounts.models import OTPChallenge

        old = OTPChallenge.objects.filter(
            id=serializer.validated_data["challenge_id"],
            is_used=False,
        ).first()
        if not old:
            raise AmaniBuildAPIException("Challenge not found.", code="challenge_not_found")

        old.is_used = True
        old.used_at = timezone.now()
        old.save(update_fields=["is_used", "used_at", "updated_at"])

        challenge, code = create_otp_challenge(
            purpose=old.purpose,
            user=old.user,
            email=old.email,
            phone=old.phone,
        )
        return _success(
            {
                "message": "A new verification code has been sent.",
                "otp": _otp_payload(challenge, code),
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"])
    def get(self, request):
        from apps.companies.models import CompanyMembership
        from apps.companies.serializers import UserCompanyContextSerializer

        memberships = (
            CompanyMembership.objects.filter(user=request.user, is_active=True, is_deleted=False)
            .select_related("company")
            .order_by("-joined_at")
        )
        return _success(
            {
                "user": UserSerializer(request.user).data,
                "companies": UserCompanyContextSerializer(memberships, many=True).data,
            }
        )


class RefreshTokenView(TokenRefreshView):
    """JWT refresh — wraps simplejwt with success envelope."""

    @extend_schema(tags=["Auth"])
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            return Response({"success": True, "data": {"tokens": response.data}})
        return response
