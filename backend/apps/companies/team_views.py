"""Team management, invitations, and RBAC API views."""

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.invitation_services import (
    accept_team_invitation,
    create_team_invitation,
    get_invitation_by_token,
    resend_team_invitation,
    revoke_team_invitation,
    should_expose_invite_token,
)
from apps.companies.models import CompanyMembership, CompanyRole, InvitationStatus, TeamInvitation
from apps.companies.permissions import CanManageTeam, HasCompanyAccess
from apps.companies.rbac import ROLE_LABELS, get_invitable_roles
from apps.companies.serializers import (
    CompanyMembershipSerializer,
    CompanyMembershipUpdateSerializer,
    CompanyRoleOptionSerializer,
    InvitationAcceptSerializer,
    TeamInvitationCreateSerializer,
    TeamInvitationSerializer,
)
from apps.companies.services import get_user_company_role
from apps.core.exceptions import AmaniBuildAPIException


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _invite_payload(invitation: TeamInvitation, token: str | None = None) -> dict:
    data = TeamInvitationSerializer(invitation).data
    if token and should_expose_invite_token():
        data["invite_token"] = token
    return data


class CompanyMemberListView(APIView):
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    @extend_schema(tags=["Team"])
    def get(self, request):
        members = (
            request.company.memberships.filter(is_deleted=False)
            .select_related("user")
            .order_by("-joined_at")
        )
        return _success({"members": CompanyMembershipSerializer(members, many=True).data})


class CompanyMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, CanManageTeam]

    def _get_membership(self, request, membership_id):
        membership = (
            request.company.memberships.filter(id=membership_id, is_deleted=False)
            .select_related("user")
            .first()
        )
        if not membership:
            raise AmaniBuildAPIException("Team member not found.", code="not_found")
        return membership

    @extend_schema(request=CompanyMembershipUpdateSerializer, tags=["Team"])
    def patch(self, request, membership_id):
        membership = self._get_membership(request, membership_id)
        if membership.user_id == request.company.owner_id:
            raise AmaniBuildAPIException("Cannot modify the company owner.", code="forbidden")

        serializer = CompanyMembershipUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "role" in data:
            from apps.companies.invitation_services import assert_can_assign_role

            assert_can_assign_role(request.user, request.company, data["role"])
            membership.role = data["role"]
        if "job_title" in data:
            membership.job_title = data["job_title"]
        if "is_active" in data:
            membership.is_active = data["is_active"]

        membership.save()
        return _success({"member": CompanyMembershipSerializer(membership).data})

    @extend_schema(tags=["Team"])
    def delete(self, request, membership_id):
        membership = self._get_membership(request, membership_id)
        if membership.user_id == request.company.owner_id:
            raise AmaniBuildAPIException("Cannot remove the company owner.", code="forbidden")

        membership.is_active = False
        membership.save(update_fields=["is_active", "updated_at"])
        return _success({"message": "Team member deactivated."})


class TeamInvitationListCreateView(APIView):
    permission_classes = [IsAuthenticated, CanManageTeam]

    @extend_schema(tags=["Team"])
    def get(self, request):
        invitations = request.company.invitations.filter(is_deleted=False).order_by("-created_at")
        return _success({"invitations": TeamInvitationSerializer(invitations, many=True).data})

    @extend_schema(request=TeamInvitationCreateSerializer, tags=["Team"])
    def post(self, request):
        serializer = TeamInvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        invitation, token = create_team_invitation(
            company=request.company,
            invited_by=request.user,
            email=data["email"],
            role=data["role"],
            job_title=data.get("job_title", ""),
            message=data.get("message", ""),
        )
        return _success(
            {
                "message": "Invitation sent.",
                "invitation": _invite_payload(invitation, token),
            },
            status.HTTP_201_CREATED,
        )


class TeamInvitationDetailView(APIView):
    permission_classes = [IsAuthenticated, CanManageTeam]

    def _get_invitation(self, request, invitation_id):
        invitation = request.company.invitations.filter(id=invitation_id, is_deleted=False).first()
        if not invitation:
            raise AmaniBuildAPIException("Invitation not found.", code="not_found")
        return invitation

    @extend_schema(tags=["Team"])
    def delete(self, request, invitation_id):
        invitation = self._get_invitation(request, invitation_id)
        revoke_team_invitation(invitation)
        return _success({"message": "Invitation revoked."})


class TeamInvitationResendView(APIView):
    permission_classes = [IsAuthenticated, CanManageTeam]

    @extend_schema(tags=["Team"])
    def post(self, request, invitation_id):
        invitation = TeamInvitation.objects.filter(
            company=request.company,
            id=invitation_id,
            is_deleted=False,
        ).first()
        if not invitation:
            raise AmaniBuildAPIException("Invitation not found.", code="not_found")

        invitation, token = resend_team_invitation(invitation)
        return _success(
            {
                "message": "Invitation resent.",
                "invitation": _invite_payload(invitation, token),
            }
        )


class CompanyRoleListView(APIView):
    """Roles the current user may assign when inviting or updating members."""

    permission_classes = [IsAuthenticated, CanManageTeam]

    @extend_schema(tags=["Team"])
    def get(self, request):
        actor_role = get_user_company_role(request.user, request.company)
        roles = get_invitable_roles(actor_role or "")
        options = [
            {"value": role, "label": ROLE_LABELS.get(role, role)}
            for role in roles
        ]
        return _success({"roles": CompanyRoleOptionSerializer(options, many=True).data})


class InvitationPreviewView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Team"])
    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            raise AmaniBuildAPIException("Invitation token is required.", code="token_required")

        invitation = get_invitation_by_token(token)
        return _success(
            {
                "email": invitation.email,
                "role": invitation.role,
                "role_label": ROLE_LABELS.get(invitation.role, invitation.role),
                "company_name": invitation.company.name,
                "expires_at": invitation.expires_at.isoformat(),
            }
        )


class InvitationAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=InvitationAcceptSerializer, tags=["Team"])
    def post(self, request):
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = accept_team_invitation(token=serializer.validated_data["token"], user=request.user)
        return _success(
            {
                "message": "Invitation accepted.",
                "membership": CompanyMembershipSerializer(membership).data,
            }
        )
