"""Site management business logic."""

from apps.companies.models import Company, Site, SiteStatus, SiteType
from apps.core.exceptions import AmaniBuildAPIException


def create_site(*, company: Company, data: dict, is_primary: bool | None = None) -> Site:
    if is_primary is None:
        is_primary = not company.sites.filter(is_deleted=False).exists()

    code = data.get("code", "")
    if code and company.sites.filter(code=code, is_deleted=False).exists():
        raise AmaniBuildAPIException("A site with this code already exists.", code="duplicate_code")

    if is_primary:
        company.sites.filter(is_deleted=False, is_primary=True).update(is_primary=False)

    return Site.objects.create(
        company=company,
        name=data["name"],
        code=code,
        site_type=data.get("site_type", SiteType.RESIDENTIAL),
        status=data.get("status", SiteStatus.PLANNING),
        address_line=data.get("address_line", ""),
        city=data.get("city", ""),
        county=data.get("county", ""),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        expected_start_date=data.get("expected_start_date"),
        expected_end_date=data.get("expected_end_date"),
        description=data.get("description", ""),
        is_primary=is_primary,
    )


def update_site(site: Site, data: dict) -> Site:
    if "code" in data and data["code"]:
        duplicate = (
            site.company.sites.filter(code=data["code"], is_deleted=False)
            .exclude(pk=site.pk)
            .exists()
        )
        if duplicate:
            raise AmaniBuildAPIException("A site with this code already exists.", code="duplicate_code")

    if data.get("is_primary"):
        site.company.sites.filter(is_deleted=False, is_primary=True).exclude(pk=site.pk).update(
            is_primary=False
        )

    for field in (
        "name",
        "code",
        "site_type",
        "status",
        "address_line",
        "city",
        "county",
        "latitude",
        "longitude",
        "expected_start_date",
        "expected_end_date",
        "description",
        "is_primary",
    ):
        if field in data:
            setattr(site, field, data[field])

    site.save()
    return site
