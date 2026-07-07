from datetime import time

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.attendance.models import AttendanceDayStatus, AttendanceEventType, ProjectWorkerAssignment
from apps.companies.models import Company, CompanyMembership, CompanyRole, SubscriptionPlan


@pytest.fixture
def plans(db):
    SubscriptionPlan.objects.get_or_create(
        code="free",
        defaults={"name": "Free", "max_projects": 1, "max_users": 5, "max_storage_gb": 2},
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
        email="john@simba.co.ke",
        password="SecurePass123!",
        first_name="John",
        last_name="Kamau",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )


@pytest.fixture
def owner_client(owner_user, plans):
    client = _auth_client(owner_user)
    client.post(
        reverse("onboarding-company"),
        {"name": "Simba Contractors Ltd", "plan_code": "free"},
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
def project_and_site(owner_client):
    company = Company.objects.get(name="Simba Contractors Ltd")
    site = company.sites.first()
    project_resp = owner_client.post(
        reverse("project-list"),
        {"name": "Riverside Heights", "site_id": str(site.id)},
        format="json",
    )
    return project_resp.data["data"]["project"], site


@pytest.fixture
def assigned_worker(owner_client, worker_user, project_and_site):
    project, _site = project_and_site
    company = Company.objects.get(name="Simba Contractors Ltd")
    CompanyMembership.objects.create(company=company, user=worker_user, role=CompanyRole.WORKER)
    owner_client.post(
        reverse("project-attendance-assignments", args=[project["id"]]),
        {
            "worker_id": str(worker_user.id),
            "trade": "mason",
            "employee_code": "AB-W-2458",
            "shift_start_time": "07:00:00",
            "shift_end_time": "17:00:00",
        },
        format="json",
    )
    return worker_user


@pytest.mark.django_db
def test_assign_worker_and_dashboard(owner_client, project_and_site, assigned_worker, worker_user):
    project, site = project_and_site
    worker_client = _auth_client(worker_user)

    point = owner_client.post(
        reverse("site-check-in-points", args=[site.id]),
        {"name": "Main Gate"},
        format="json",
    )
    code = point.data["data"]["check_in_point"]["code"]

    clock_in = worker_client.post(
        reverse("attendance-qr-scan"),
        {"project_id": project["id"], "check_in_point_code": code},
        format="json",
    )
    assert clock_in.status_code == 201
    assert clock_in.data["data"]["activity"]["status"] in {
        AttendanceDayStatus.PRESENT,
        AttendanceDayStatus.LATE,
    }

    dashboard = owner_client.get(
        reverse("project-attendance-dashboard", args=[project["id"]]),
        {"date": timezone.localdate().isoformat()},
    )
    assert dashboard.status_code == 200
    data = dashboard.data["data"]["dashboard"]
    assert data["total_assigned"] == 1
    assert data["present_today"] == 1
    assert data["on_site_now"] == 1


@pytest.mark.django_db
def test_duplicate_qr_scan_warning(owner_client, project_and_site, assigned_worker, worker_user):
    project, site = project_and_site
    worker_client = _auth_client(worker_user)

    point = owner_client.post(
        reverse("site-check-in-points", args=[site.id]),
        {"name": "Main Gate"},
        format="json",
    )
    code = point.data["data"]["check_in_point"]["code"]

    worker_client.post(
        reverse("attendance-qr-scan"),
        {"project_id": project["id"], "check_in_point_code": code},
        format="json",
    )
    second = worker_client.post(
        reverse("attendance-qr-scan"),
        {"project_id": project["id"], "check_in_point_code": code},
        format="json",
    )
    assert second.status_code == 200
    assert second.data["data"]["warning"]["code"] == "duplicate_scan"


@pytest.mark.django_db
def test_manual_mark_absent(owner_client, project_and_site, assigned_worker, worker_user):
    project, _site = project_and_site
    work_date = timezone.localdate().isoformat()

    response = owner_client.post(
        reverse("project-attendance-mark", args=[project["id"]]),
        {
            "worker_id": str(worker_user.id),
            "work_date": work_date,
            "status": AttendanceDayStatus.ABSENT,
            "notes": "Did not report to site",
        },
        format="json",
    )
    assert response.status_code == 200

    dashboard = owner_client.get(
        reverse("project-attendance-dashboard", args=[project["id"]]),
        {"date": work_date},
    )
    assert dashboard.data["data"]["dashboard"]["absent_today"] == 1


@pytest.mark.django_db
def test_worker_mobile_clock_and_history(
    owner_client, project_and_site, assigned_worker, worker_user
):
    project, _site = project_and_site
    worker_client = _auth_client(worker_user)

    check_in = worker_client.post(
        reverse("attendance-clock"),
        {"project_id": project["id"], "event_type": AttendanceEventType.CHECK_IN},
        format="json",
    )
    assert check_in.status_code == 201

    today = worker_client.get(
        reverse("attendance-me-today"),
        {"project_id": project["id"]},
    )
    assert today.status_code == 200
    assert today.data["data"]["activity"]["on_site_now"] is True

    check_out = worker_client.post(
        reverse("attendance-clock"),
        {"project_id": project["id"], "event_type": AttendanceEventType.CHECK_OUT},
        format="json",
    )
    assert check_out.status_code == 201

    history = owner_client.get(
        reverse("worker-attendance-history", args=[project["id"], worker_user.id]),
    )
    assert history.status_code == 200
    assert len(history.data["data"]["history"]["calendar"]) >= 1


@pytest.mark.django_db
def test_late_arrival_detected(owner_client, project_and_site, worker_user):
    from datetime import datetime, timedelta

    project, site = project_and_site
    company = Company.objects.get(name="Simba Contractors Ltd")
    CompanyMembership.objects.create(company=company, user=worker_user, role=CompanyRole.WORKER)
    ProjectWorkerAssignment.objects.create(
        company=company,
        project_id=project["id"],
        worker=worker_user,
        trade="mason",
        shift_start_time=time(7, 0),
        shift_end_time=time(17, 0),
    )

    point = owner_client.post(
        reverse("site-check-in-points", args=[site.id]),
        {"name": "Main Gate"},
        format="json",
    )
    code = point.data["data"]["check_in_point"]["code"]

    work_date = timezone.localdate()
    late_time = timezone.make_aware(datetime.combine(work_date, time(8, 30)))
    worker_client = _auth_client(worker_user)
    response = worker_client.post(
        reverse("attendance-qr-scan"),
        {
            "project_id": project["id"],
            "check_in_point_code": code,
            "event_at": late_time.isoformat(),
        },
        format="json",
    )
    assert response.status_code == 201
    assert "event_id" in response.data["data"]

    today = worker_client.get(
        reverse("attendance-me-today"),
        {"project_id": project["id"], "date": work_date.isoformat()},
    )
    assert today.data["data"]["activity"]["status"] == AttendanceDayStatus.LATE
