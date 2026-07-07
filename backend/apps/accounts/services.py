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
