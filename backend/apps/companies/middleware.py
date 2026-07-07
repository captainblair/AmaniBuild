"""Tenant context middleware."""

from apps.companies.services import resolve_request_company


class TenantMiddleware:
    """
    Attach the active company to each request.
    Clients may pass X-Company-ID header to select tenant context.

    Note: JWT auth runs in DRF after this middleware. Company-scoped API
    views resolve tenant again via attach_request_company() in permissions.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.company = None
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            company_id = request.headers.get("X-Company-ID")
            request.company = resolve_request_company(user, company_id)
        return self.get_response(request)
