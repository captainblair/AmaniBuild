"""Company and onboarding URL routes."""

from django.urls import path

from apps.companies.site_views import SiteDetailView, SiteListCreateView
from apps.companies.team_views import (
    CompanyMemberDetailView,
    CompanyMemberListView,
    CompanyRoleListView,
    InvitationAcceptView,
    InvitationPreviewView,
    TeamInvitationDetailView,
    TeamInvitationListCreateView,
    TeamInvitationResendView,
)
from apps.companies.views import (
    CompanyCreateView,
    CompanyDetailView,
    OnboardingCompleteView,
    OnboardingStatusView,
    SiteCreateView,
    SubscriptionPlanListView,
)

urlpatterns = [
    path("plans/", SubscriptionPlanListView.as_view(), name="subscription-plans"),
    path("onboarding/status/", OnboardingStatusView.as_view(), name="onboarding-status"),
    path("onboarding/company/", CompanyCreateView.as_view(), name="onboarding-company"),
    path("onboarding/site/", SiteCreateView.as_view(), name="onboarding-site"),
    path("onboarding/complete/", OnboardingCompleteView.as_view(), name="onboarding-complete"),
    path("company/", CompanyDetailView.as_view(), name="company-detail"),
    path("company/sites/", SiteListCreateView.as_view(), name="company-sites"),
    path("company/sites/<uuid:site_id>/", SiteDetailView.as_view(), name="company-site-detail"),
    path("company/members/", CompanyMemberListView.as_view(), name="company-members"),
    path("company/members/<uuid:membership_id>/", CompanyMemberDetailView.as_view(), name="company-member-detail"),
    path("company/invitations/", TeamInvitationListCreateView.as_view(), name="company-invitations"),
    path("company/invitations/<uuid:invitation_id>/", TeamInvitationDetailView.as_view(), name="company-invitation-detail"),
    path(
        "company/invitations/<uuid:invitation_id>/resend/",
        TeamInvitationResendView.as_view(),
        name="company-invitation-resend",
    ),
    path("company/roles/", CompanyRoleListView.as_view(), name="company-roles"),
    path("invitations/preview/", InvitationPreviewView.as_view(), name="invitation-preview"),
    path("invitations/accept/", InvitationAcceptView.as_view(), name="invitation-accept"),
]
