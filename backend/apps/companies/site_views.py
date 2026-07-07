"""Site management API views."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.models import Site
from apps.companies.permissions import CanManageSites, HasCompanyAccess
from apps.companies.serializers import SiteCreateSerializer, SiteSerializer, SiteUpdateSerializer
from apps.companies.site_services import create_site, update_site
from apps.core.exceptions import AmaniBuildAPIException


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _get_site_or_404(company, site_id) -> Site:
    site = company.sites.filter(id=site_id, is_deleted=False).first()
    if not site:
        raise AmaniBuildAPIException("Site not found.", code="not_found")
    return site


class SiteListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageSites()]
        return [IsAuthenticated(), HasCompanyAccess()]

    @extend_schema(tags=["Sites"])
    def get(self, request):
        sites = request.company.sites.filter(is_deleted=False).order_by("-is_primary", "name")
        return _success({"sites": SiteSerializer(sites, many=True).data})

    @extend_schema(request=SiteCreateSerializer, tags=["Sites"])
    def post(self, request):
        serializer = SiteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        site = create_site(company=request.company, data=serializer.validated_data)
        return _success({"site": SiteSerializer(site).data}, status.HTTP_201_CREATED)


class SiteDetailView(APIView):
    def get_permissions(self):
        if self.request.method in {"PATCH", "DELETE"}:
            return [IsAuthenticated(), CanManageSites()]
        return [IsAuthenticated(), HasCompanyAccess()]

    @extend_schema(tags=["Sites"])
    def get(self, request, site_id):
        site = _get_site_or_404(request.company, site_id)
        data = SiteSerializer(site).data
        data["project_count"] = site.projects.filter(is_deleted=False).count()
        return _success({"site": data})

    @extend_schema(request=SiteUpdateSerializer, tags=["Sites"])
    def patch(self, request, site_id):
        site = _get_site_or_404(request.company, site_id)
        serializer = SiteUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        site = update_site(site, serializer.validated_data)
        return _success({"site": SiteSerializer(site).data})

    @extend_schema(tags=["Sites"])
    def delete(self, request, site_id):
        site = _get_site_or_404(request.company, site_id)
        if site.is_primary:
            raise AmaniBuildAPIException(
                "Cannot archive the primary site. Set another site as primary first.",
                code="primary_site",
            )
        if site.projects.filter(is_deleted=False).exists():
            raise AmaniBuildAPIException(
                "Cannot archive a site with active projects. Reassign or archive projects first.",
                code="site_has_projects",
            )

        site.soft_delete()
        return _success({"message": "Site archived."})
