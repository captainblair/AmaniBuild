"""Procurement URL routes."""

from django.urls import path

from apps.procurement.views import (
    PurchaseRequestActivityView,
    PurchaseRequestApproveView,
    PurchaseRequestDetailView,
    PurchaseRequestListCreateView,
    PurchaseRequestRejectView,
    PurchaseRequestSubmitView,
)

urlpatterns = [
    path("purchase-requests/", PurchaseRequestListCreateView.as_view(), name="purchase-request-list"),
    path("purchase-requests/<uuid:request_id>/", PurchaseRequestDetailView.as_view(), name="purchase-request-detail"),
    path(
        "purchase-requests/<uuid:request_id>/submit/",
        PurchaseRequestSubmitView.as_view(),
        name="purchase-request-submit",
    ),
    path(
        "purchase-requests/<uuid:request_id>/approve/",
        PurchaseRequestApproveView.as_view(),
        name="purchase-request-approve",
    ),
    path(
        "purchase-requests/<uuid:request_id>/reject/",
        PurchaseRequestRejectView.as_view(),
        name="purchase-request-reject",
    ),
    path(
        "purchase-requests/<uuid:request_id>/activity/",
        PurchaseRequestActivityView.as_view(),
        name="purchase-request-activity",
    ),
]
