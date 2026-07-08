"""Core API views."""

from django.db import connection

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema


class HealthCheckView(APIView):
    """Liveness and readiness probe for deployments."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Health check",
        description="Returns API status and database connectivity.",
        tags=["System"],
    )
    def get(self, request):
        db_ok = True
        db_error = None
        try:
            connection.ensure_connection()
        except Exception as exc:  # noqa: BLE001
            db_ok = False
            db_error = str(exc)

        status_label = "healthy" if db_ok else "degraded"
        http_status = 200 if db_ok else 503

        return Response(
            {
                "success": db_ok,
                "status": status_label,
                "service": "amanibuild-api",
                "version": "0.1.0",
                "phase": "17-scheduling",
                "checks": {
                    "database": {"ok": db_ok, "error": db_error},
                },
            },
            status=http_status,
        )


class APIRootView(APIView):
    """Top-level API discovery endpoint."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(summary="API root", tags=["System"])
    def get(self, request):
        return Response(
            {
                "success": True,
                "name": "AmaniBuild API",
                "version": "v1",
                "documentation": "/api/docs/",
                "health": "/api/v1/health/",
            }
        )
