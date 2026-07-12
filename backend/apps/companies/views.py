"""Company, onboarding, and subscription plan API views."""

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.models import (
    Company,
    CompanyMembership,
    CompanyRole,
    OnboardingStep,
    SubscriptionPlan,
)
from apps.companies.permissions import HasCompanyAccess, IsCompanyOwner
from apps.companies.serializers import (
    CompanyCreateSerializer,
    CompanyPlanChangeSerializer,
    CompanySerializer,
    OnboardingStatusSerializer,
    SiteCreateSerializer,
    SiteSerializer,
    SubscriptionPlanSerializer,
)
from apps.companies.site_services import create_site
from apps.companies.services import (
    advance_onboarding,
    change_company_plan,
    complete_onboarding,
    get_user_primary_company,
)
from apps.core.exceptions import AmaniBuildAPIException


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


class SubscriptionPlanListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Billing"])
    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True)
        return _success({"plans": SubscriptionPlanSerializer(plans, many=True).data})


class OnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=OnboardingStatusSerializer, tags=["Onboarding"])
    def get(self, request):
        company = get_user_primary_company(request.user)
        if not company:
            return _success(
                {
                    "has_company": False,
                    "onboarding_step": None,
                    "is_complete": False,
                    "company": None,
                    "primary_site": None,
                    "next_action": "create_company",
                }
            )

        primary_site = company.sites.filter(is_primary=True, is_deleted=False).first()
        next_action = _next_onboarding_action(company)

        return _success(
            {
                "has_company": True,
                "onboarding_step": company.onboarding_step,
                "is_complete": company.is_onboarding_complete,
                "company": CompanySerializer(company).data,
                "primary_site": SiteSerializer(primary_site).data if primary_site else None,
                "next_action": next_action,
            }
        )


def _next_onboarding_action(company: Company) -> str | None:
    if company.is_onboarding_complete:
        return None
    mapping = {
        OnboardingStep.COMPANY_PROFILE: "create_company",
        OnboardingStep.FIRST_SITE: "create_site",
        OnboardingStep.INVITE_TEAM: "invite_team",
    }
    return mapping.get(company.onboarding_step)


class CompanyCreateView(APIView):
    """Onboarding step 1 — create company tenant."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=CompanyCreateSerializer, tags=["Onboarding"])
    def post(self, request):
        if get_user_primary_company(request.user):
            raise AmaniBuildAPIException(
                "You already belong to a company. Use company settings to update.",
                code="company_exists",
            )

        serializer = CompanyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = SubscriptionPlan.objects.filter(code=data.get("plan_code", "free")).first()
        if not plan:
            raise AmaniBuildAPIException("Invalid subscription plan.", code="invalid_plan")

        company = Company.objects.create(
            name=data["name"],
            legal_name=data.get("legal_name", ""),
            registration_number=data.get("registration_number", ""),
            kra_pin=data.get("kra_pin", ""),
            email=data.get("email", request.user.email),
            phone=data.get("phone", request.user.phone or ""),
            website=data.get("website", ""),
            address_line=data.get("address_line", ""),
            city=data.get("city", ""),
            county=data.get("county", ""),
            owner=request.user,
            plan=plan,
            onboarding_step=OnboardingStep.FIRST_SITE,
        )

        CompanyMembership.objects.create(
            company=company,
            user=request.user,
            role=CompanyRole.OWNER,
            job_title="Company Owner",
        )

        return _success(
            {
                "message": "Company created successfully.",
                "company": CompanySerializer(company).data,
                "next_action": "create_site",
            },
            status.HTTP_201_CREATED,
        )


class SiteCreateView(APIView):
    """Onboarding step 2 — create first construction site."""

    permission_classes = [IsAuthenticated, HasCompanyAccess, IsCompanyOwner]

    @extend_schema(request=SiteCreateSerializer, tags=["Onboarding"])
    def post(self, request):
        company = request.company
        if company.onboarding_step not in {
            OnboardingStep.FIRST_SITE,
            OnboardingStep.COMPANY_PROFILE,
        } and not company.sites.filter(is_deleted=False).exists():
            pass  # allow first site
        elif company.is_onboarding_complete:
            raise AmaniBuildAPIException("Onboarding is already complete.", code="onboarding_complete")

        serializer = SiteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_first_site = not company.sites.filter(is_deleted=False).exists()
        site = create_site(
            company=company,
            data=serializer.validated_data,
            is_primary=is_first_site,
        )

        advance_onboarding(company, OnboardingStep.INVITE_TEAM)

        return _success(
            {
                "message": "Site created successfully.",
                "site": SiteSerializer(site).data,
                "next_action": "invite_team",
            },
            status.HTTP_201_CREATED,
        )


class OnboardingCompleteView(APIView):
    """Mark onboarding complete after the invite-team step."""

    permission_classes = [IsAuthenticated, HasCompanyAccess, IsCompanyOwner]

    @extend_schema(tags=["Onboarding"])
    def post(self, request):
        company = request.company
        if company.onboarding_step != OnboardingStep.INVITE_TEAM:
            raise AmaniBuildAPIException(
                "Complete the invite team step before finishing onboarding.",
                code="onboarding_step_invalid",
            )
        if not company.sites.filter(is_deleted=False).exists():
            raise AmaniBuildAPIException(
                "Create at least one site before completing onboarding.",
                code="site_required",
            )

        complete_onboarding(company)
        return _success(
            {
                "message": "Onboarding complete. Welcome to AmaniBuild!",
                "company": CompanySerializer(company).data,
            }
        )


class CompanyDetailView(APIView):
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    @extend_schema(tags=["Companies"])
    def get(self, request):
        return _success({"company": CompanySerializer(request.company).data})


class CompanyPlanChangeView(APIView):
    """Owner-only plan switch. Billing/payment is stubbed until integrations phase."""

    permission_classes = [IsAuthenticated, HasCompanyAccess, IsCompanyOwner]

    @extend_schema(request=CompanyPlanChangeSerializer, tags=["Companies"])
    def post(self, request):
        serializer = CompanyPlanChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = change_company_plan(request.company, serializer.validated_data["plan_code"])
        return _success(
            {
                "message": f"Plan updated to {company.plan.name}.",
                "company": CompanySerializer(company).data,
            }
        )
