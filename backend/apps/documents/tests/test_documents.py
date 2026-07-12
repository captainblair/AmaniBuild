import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan
from apps.documents.models import LibraryAssetType, LibraryDocumentType, LibraryItem


@pytest.fixture
def plans(db):
    SubscriptionPlan.objects.get_or_create(
        code="free",
        defaults={
            "name": "Free",
            "price_kes_monthly": 0,
            "max_projects": 5,
            "max_users": 10,
            "max_storage_gb": 2,
        },
    )


def _auth_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(
        email="owner@simba.co.ke",
        password="SecurePass123!",
        first_name="James",
        last_name="Mwangi",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )


@pytest.fixture
def worker_user(db):
    return User.objects.create_user(
        email="worker@simba.co.ke",
        password="SecurePass123!",
        first_name="Brian",
        last_name="Otieno",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )


@pytest.fixture
def owner_client(owner_user, plans):
    client = _auth_client(owner_user)
    client.post(
        reverse("onboarding-company"),
        {"name": "Simba Contractors Ltd", "plan_code": "free", "county": "Nairobi"},
        format="json",
    )
    client.post(
        reverse("onboarding-site"),
        {"name": "Riverside Heights", "city": "Westlands", "county": "Nairobi"},
        format="json",
    )
    client.post(reverse("onboarding-complete"), format="json")
    return client


@pytest.fixture
def company(owner_client):
    return Company.objects.get(name="Simba Contractors Ltd")


@pytest.fixture
def worker_client(worker_user, company):
    CompanyMembership.objects.create(
        company=company,
        user=worker_user,
        role=CompanyRole.WORKER,
        is_active=True,
    )
    return _auth_client(worker_user)


@pytest.mark.django_db
def test_upload_list_and_folders(owner_client):
    response = owner_client.post(
        reverse("library-list"),
        {
            "title": "structural_drawing_block_b.dwg",
            "asset_type": LibraryAssetType.DOCUMENT,
            "document_type": LibraryDocumentType.DRAWING,
            "folder_path": "Drawings/Structural",
            "file_extension": "dwg",
            "size_bytes": 2400000,
            "file_url": "https://example.com/block-b.dwg",
        },
        format="json",
    )
    assert response.status_code == 201

    listing = owner_client.get(reverse("library-list"))
    assert listing.status_code == 200
    assert listing.data["pagination"]["count"] == 1
    assert listing.data["summary"]["documents"] == 1

    folders = owner_client.get(reverse("library-folders"))
    assert folders.status_code == 200
    assert folders.data["data"]["folders"][0]["folder"] == "Drawings/Structural"


@pytest.mark.django_db
def test_photos_timeline(owner_client):
    owner_client.post(
        reverse("library-list"),
        {
            "title": "site_photo_may_19.jpg",
            "asset_type": LibraryAssetType.PHOTO,
            "document_type": LibraryDocumentType.OTHER,
            "folder_path": "Photos/May 2025",
            "file_extension": "jpg",
            "size_bytes": 900000,
            "file_url": "https://example.com/site_photo.jpg",
            "captured_at": "2026-05-19T08:30:00Z",
        },
        format="json",
    )
    owner_client.post(
        reverse("library-list"),
        {
            "title": "site_photo_may_20.jpg",
            "asset_type": LibraryAssetType.PHOTO,
            "document_type": LibraryDocumentType.OTHER,
            "folder_path": "Photos/May 2025",
            "file_extension": "jpg",
            "size_bytes": 910000,
            "file_url": "https://example.com/site_photo2.jpg",
            "captured_at": "2026-05-20T09:00:00Z",
        },
        format="json",
    )

    timeline = owner_client.get(reverse("library-photos"))
    assert timeline.status_code == 200
    assert timeline.data["data"]["timeline"][0]["month"] == "2026-05"
    assert timeline.data["data"]["timeline"][0]["count"] == 2


@pytest.mark.django_db
def test_item_versions(owner_client):
    create = owner_client.post(
        reverse("library-list"),
        {
            "title": "contract_subcontractor_2025.pdf",
            "asset_type": LibraryAssetType.DOCUMENT,
            "document_type": LibraryDocumentType.CONTRACT,
            "folder_path": "Contracts/Subcontracts",
            "file_extension": "pdf",
            "size_bytes": 1800000,
            "file_url": "https://example.com/contract-v1.pdf",
        },
        format="json",
    )
    item_id = create.data["data"]["item"]["id"]

    version = owner_client.post(
        reverse("library-versions", kwargs={"item_id": item_id}),
        {
            "file_url": "https://example.com/contract-v2.pdf",
            "size_bytes": 1850000,
        },
        format="json",
    )
    assert version.status_code == 201
    assert version.data["data"]["item"]["version_number"] == 2

    versions = owner_client.get(reverse("library-versions", kwargs={"item_id": item_id}))
    assert versions.status_code == 200
    assert len(versions.data["data"]["versions"]) == 2
    assert versions.data["data"]["versions"][0]["is_current_version"] is True


@pytest.mark.django_db
def test_worker_can_view_not_upload(worker_client, owner_client):
    owner_client.post(
        reverse("library-list"),
        {
            "title": "inspection_level4.pdf",
            "asset_type": LibraryAssetType.DOCUMENT,
            "document_type": LibraryDocumentType.INSPECTION,
        },
        format="json",
    )

    listing = worker_client.get(reverse("library-list"))
    assert listing.status_code == 200

    create = worker_client.post(
        reverse("library-list"),
        {
            "title": "unauthorized.pdf",
            "asset_type": LibraryAssetType.DOCUMENT,
            "document_type": LibraryDocumentType.REPORT,
        },
        format="json",
    )
    assert create.status_code == 403


@pytest.mark.django_db
def test_file_upload_endpoint(owner_client, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.MEDIA_URL = "/media/"

    from django.core.files.uploadedfile import SimpleUploadedFile

    uploaded = SimpleUploadedFile(
        "site_plan.pdf",
        b"%PDF-1.4 test content",
        content_type="application/pdf",
    )
    response = owner_client.post(
        reverse("library-upload"),
        {"file": uploaded},
        format="multipart",
    )
    assert response.status_code == 201
    payload = response.data["data"]
    assert payload["file_extension"] == "pdf"
    assert payload["mime_type"] == "application/pdf"
    assert payload["size_bytes"] > 0
    assert payload["file_url"]
    assert "site_plan.pdf" in payload["original_name"]

