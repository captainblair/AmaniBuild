"""Team invitation business logic."""

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from apps.companies.models import (
    Company,
    CompanyMembership,
    CompanyRole,
    InvitationStatus,
    TeamInvitation,
)
from apps.companies.rbac import get_invitable_roles
from apps.core.exceptions import AmaniBuildAPIException

logger = logging.getLogger(__name__)
User = get_user_model()

INVITE_TTL_DAYS = 7


def _hash_token(token: str) -> str:
    return make_password(token)


def _check_token(token: str, token_hash: str) -> bool:
    return check_password(token, token_hash)


def generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


def should_expose_invite_token() -> bool:
    return getattr(settings, "AMANIBUILD_EXPOSE_INVITE_TOKEN", settings.DEBUG)


def send_invitation_notification(*, email: str, company: Company, role: str, token: str) -> None:
    """Dispatch invite email. Console logging until Phase 17 integrations."""
    link = f"/accept-invite?token={token}"
    message = (
        f"You have been invited to join {company.name} on AmaniBuild as "
        f"{dict(CompanyRole.choices).get(role, role)}. Accept: {link}"
    )
    logger.info("Invite email to %s: %s", email, message)


def get_company_seat_usage(company: Company) -> int:
    active_members = CompanyMembership.objects.filter(
        company=company,
        is_active=True,
        is_deleted=False,
    ).count()
    pending_invites = TeamInvitation.objects.filter(
        company=company,
        status=InvitationStatus.PENDING,
        is_deleted=False,
        expires_at__gt=timezone.now(),
    ).count()
    return active_members + pending_invites


def assert_can_add_seat(company: Company) -> None:
    if get_company_seat_usage(company) >= company.plan.max_users:
        raise AmaniBuildAPIException(
            f"Your {company.plan.name} plan allows up to {company.plan.max_users} users. "
            "Upgrade your plan or remove members before inviting more people.",
            code="plan_user_limit",
        )


def get_membership(user, company: Company) -> CompanyMembership | None:
    return CompanyMembership.objects.filter(
        company=company,
        user=user,
        is_active=True,
        is_deleted=False,
    ).first()


def get_user_company_role(user, company: Company) -> str | None:
    membership = get_membership(user, company)
    if membership:
        return membership.role
    if company.owner_id == user.id:
        return CompanyRole.OWNER
    return None


def assert_can_assign_role(actor, company: Company, role: str) -> None:
    actor_role = get_user_company_role(actor, company)
    if not actor_role:
        raise AmaniBuildAPIException("You do not belong to this company.", code="forbidden")

    if role == CompanyRole.OWNER:
        raise AmaniBuildAPIException(
            "Owner role cannot be assigned via invitation.",
            code="invalid_role",
        )

    allowed = get_invitable_roles(actor_role)
    if role not in allowed:
        raise AmaniBuildAPIException(
            "You are not allowed to assign this role.",
            code="invalid_role",
        )


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _revoke_pending_invites(company: Company, email: str) -> None:
    TeamInvitation.objects.filter(
        company=company,
        email=email,
        status=InvitationStatus.PENDING,
        is_deleted=False,
    ).update(status=InvitationStatus.REVOKED, updated_at=timezone.now())


@transaction.atomic
def create_team_invitation(
    *,
    company: Company,
    invited_by,
    email: str,
    role: str,
    job_title: str = "",
    message: str = "",
) -> tuple[TeamInvitation, str]:
    email = _normalize_email(email)
    assert_can_add_seat(company)
    assert_can_assign_role(invited_by, company, role)

    if company.owner.email.lower() == email:
        raise AmaniBuildAPIException("The company owner is already a member.", code="already_member")

    if CompanyMembership.objects.filter(
        company=company,
        user__email__iexact=email,
        is_active=True,
        is_deleted=False,
    ).exists():
        raise AmaniBuildAPIException("This user is already a team member.", code="already_member")

    existing_pending = TeamInvitation.objects.filter(
        company=company,
        email=email,
        status=InvitationStatus.PENDING,
        is_deleted=False,
        expires_at__gt=timezone.now(),
    ).first()
    if existing_pending:
        raise AmaniBuildAPIException(
            "A pending invitation already exists for this email.",
            code="invite_exists",
        )

    token = generate_invite_token()
    invitation = TeamInvitation.objects.create(
        company=company,
        email=email,
        role=role,
        job_title=job_title,
        message=message,
        invited_by=invited_by,
        token_hash=_hash_token(token),
        expires_at=timezone.now() + timedelta(days=INVITE_TTL_DAYS),
    )
    send_invitation_notification(email=email, company=company, role=role, token=token)
    return invitation, token


def get_invitation_by_token(token: str) -> TeamInvitation:
    for invitation in TeamInvitation.objects.filter(
        status=InvitationStatus.PENDING,
        is_deleted=False,
    ).select_related("company", "invited_by"):
        if _check_token(token, invitation.token_hash):
            if invitation.is_expired:
                invitation.status = InvitationStatus.EXPIRED
                invitation.save(update_fields=["status", "updated_at"])
                raise AmaniBuildAPIException("This invitation has expired.", code="invite_expired")
            return invitation
    raise AmaniBuildAPIException("Invalid or expired invitation.", code="invalid_invite")


@transaction.atomic
def accept_team_invitation(*, token: str, user) -> CompanyMembership:
    invitation = get_invitation_by_token(token)

    if user.email.lower() != invitation.email:
        raise AmaniBuildAPIException(
            "This invitation was sent to a different email address.",
            code="email_mismatch",
        )

    if CompanyMembership.objects.filter(
        company=invitation.company,
        user=user,
        is_active=True,
        is_deleted=False,
    ).exists():
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.accepted_by = user
        invitation.save(update_fields=["status", "accepted_at", "accepted_by", "updated_at"])
        raise AmaniBuildAPIException("You are already a member of this company.", code="already_member")

    assert_can_add_seat(invitation.company)

    membership, created = CompanyMembership.objects.get_or_create(
        company=invitation.company,
        user=user,
        defaults={
            "role": invitation.role,
            "job_title": invitation.job_title,
            "is_active": True,
        },
    )
    if not created:
        membership.role = invitation.role
        membership.job_title = invitation.job_title or membership.job_title
        membership.is_active = True
        membership.is_deleted = False
        membership.deleted_at = None
        membership.save()

    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = timezone.now()
    invitation.accepted_by = user
    invitation.save(update_fields=["status", "accepted_at", "accepted_by", "updated_at"])

    TeamInvitation.objects.filter(
        company=invitation.company,
        email=invitation.email,
        status=InvitationStatus.PENDING,
        is_deleted=False,
    ).exclude(pk=invitation.pk).update(status=InvitationStatus.REVOKED, updated_at=timezone.now())

    return membership


@transaction.atomic
def revoke_team_invitation(invitation: TeamInvitation) -> TeamInvitation:
    if invitation.status != InvitationStatus.PENDING:
        raise AmaniBuildAPIException("Only pending invitations can be revoked.", code="invalid_status")
    invitation.status = InvitationStatus.REVOKED
    invitation.save(update_fields=["status", "updated_at"])
    return invitation


@transaction.atomic
def resend_team_invitation(invitation: TeamInvitation) -> tuple[TeamInvitation, str]:
    if invitation.status != InvitationStatus.PENDING:
        raise AmaniBuildAPIException("Only pending invitations can be resent.", code="invalid_status")
    if invitation.is_expired:
        invitation.status = InvitationStatus.EXPIRED
        invitation.save(update_fields=["status", "updated_at"])
        raise AmaniBuildAPIException("This invitation has expired. Send a new one.", code="invite_expired")

    token = generate_invite_token()
    invitation.token_hash = _hash_token(token)
    invitation.expires_at = timezone.now() + timedelta(days=INVITE_TTL_DAYS)
    invitation.save(update_fields=["token_hash", "expires_at", "updated_at"])
    send_invitation_notification(
        email=invitation.email,
        company=invitation.company,
        role=invitation.role,
        token=token,
    )
    return invitation, token
