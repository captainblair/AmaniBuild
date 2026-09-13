"""Authentication business logic — OTP, tokens, notifications."""

import hashlib
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from apps.accounts.models import OTPChallenge, OTPPurpose, PasswordResetToken, User

logger = logging.getLogger(__name__)

OTP_LENGTH = 6
OTP_TTL_MINUTES = 10
PASSWORD_RESET_TTL_MINUTES = 30
MAX_OTP_ATTEMPTS = 5


def _hash_value(value: str) -> str:
    return make_password(value)


def _check_hash(value: str, hashed: str) -> bool:
    return check_password(value, hashed)


def generate_otp_code() -> str:
    return "".join(str(secrets.randbelow(10)) for _ in range(OTP_LENGTH))


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


def _delivery_target(user: User | None, email: str | None, phone: str | None) -> tuple[str | None, str | None]:
    if user:
        return user.email, user.phone
    return email, phone


def send_otp_notification(
    *,
    code: str,
    purpose: str,
    email: str | None = None,
    phone: str | None = None,
) -> None:
    """
    Dispatch OTP via SMS/email.
    Phase 1 uses console logging; AfricasTalking integration in Phase 17.
    """
    message = f"AmaniBuild {purpose} code: {code} (valid {OTP_TTL_MINUTES} min)"
    if phone:
        logger.info("SMS OTP to %s: %s", phone, message)
    if email:
        logger.info("Email OTP to %s: %s", email, message)
    if not phone and not email:
        logger.warning("OTP generated but no delivery target configured.")


def create_otp_challenge(
    *,
    purpose: str,
    user: User | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> tuple[OTPChallenge, str]:
    """Create OTP challenge and return (challenge, plain_code)."""
    email, phone = _delivery_target(user, email, phone)
    code = generate_otp_code()

    challenge = OTPChallenge.objects.create(
        user=user,
        email=email,
        phone=phone,
        purpose=purpose,
        code_hash=_hash_value(code),
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
        max_attempts=MAX_OTP_ATTEMPTS,
    )

    send_otp_notification(code=code, purpose=purpose, email=email, phone=phone)
    return challenge, code


def verify_otp_challenge(
    *,
    purpose: str,
    code: str,
    challenge_id: str | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> OTPChallenge:
    """Validate OTP and mark challenge used. Raises ValueError on failure."""
    queryset = OTPChallenge.objects.filter(purpose=purpose, is_used=False)

    if challenge_id:
        queryset = queryset.filter(id=challenge_id)
    elif email:
        queryset = queryset.filter(email__iexact=email)
    elif phone:
        queryset = queryset.filter(phone=phone)
    else:
        raise ValueError("Challenge identifier required.")

    challenge = queryset.order_by("-created_at").first()
    if not challenge:
        raise ValueError("Invalid or expired verification code.")

    if challenge.is_expired:
        raise ValueError("Verification code has expired.")

    challenge.attempts += 1
    challenge.save(update_fields=["attempts", "updated_at"])

    if challenge.attempts > challenge.max_attempts:
        raise ValueError("Too many invalid attempts. Request a new code.")

    if not _check_hash(code, challenge.code_hash):
        raise ValueError("Invalid verification code.")

    challenge.is_used = True
    challenge.used_at = timezone.now()
    challenge.save(update_fields=["is_used", "used_at", "updated_at"])
    return challenge


def create_password_reset_token(user: User) -> tuple[PasswordResetToken, str]:
    token = generate_reset_token()
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = PasswordResetToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=timezone.now() + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES),
    )
    return record, token


def verify_password_reset_token(token: str) -> PasswordResetToken:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = PasswordResetToken.objects.filter(token_hash=token_hash, is_used=False).first()
    if not record or record.is_expired:
        raise ValueError("Invalid or expired reset token.")
    return record


def consume_password_reset_token(record: PasswordResetToken) -> None:
    record.is_used = True
    record.used_at = timezone.now()
    record.save(update_fields=["is_used", "used_at", "updated_at"])


def should_expose_otp_in_response() -> bool:
    return getattr(settings, "AMANIBUILD_EXPOSE_OTP", settings.DEBUG)


def verify_google_id_token(token: str) -> dict:
    """Verify a Google ID token and return the payload. Raises ValueError on failure."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise ValueError("Google sign-in is not configured.")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise ValueError("Google sign-in is not available on this server.") from exc

    try:
        payload = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Invalid Google token.") from exc

    issuer = payload.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Invalid Google token issuer.")
    if not payload.get("email"):
        raise ValueError("Google account did not provide an email address.")
    if not payload.get("email_verified"):
        raise ValueError("Google email is not verified.")
    return payload


def authenticate_google_user(idinfo: dict) -> tuple[User, bool]:
    """Find or create a user from a verified Google token payload."""
    google_id = str(idinfo["sub"])
    email = str(idinfo["email"]).lower()
    first_name = (idinfo.get("given_name") or "").strip()
    last_name = (idinfo.get("family_name") or "").strip()
    if not first_name and idinfo.get("name"):
        parts = str(idinfo["name"]).split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else last_name

    user = User.objects.filter(google_id=google_id).first()
    if user:
        return user, False

    user = User.objects.filter(email__iexact=email).first()
    if user:
        user.google_id = google_id
        user.is_active = True
        user.is_email_verified = True
        update_fields = ["google_id", "is_active", "is_email_verified", "updated_at"]
        if not user.first_name and first_name:
            user.first_name = first_name
            update_fields.append("first_name")
        if not user.last_name and last_name:
            user.last_name = last_name
            update_fields.append("last_name")
        user.save(update_fields=update_fields)
        return user, False

    user = User.objects.create_user(
        email=email,
        password=None,
        first_name=first_name,
        last_name=last_name,
        google_id=google_id,
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )
    return user, True
