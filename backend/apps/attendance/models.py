"""Attendance tracking models."""

import secrets

from django.conf import settings
from django.db import models

from apps.core.models import TenantScopedModel


class WorkerTrade(models.TextChoices):
    MASON = "mason", "Mason"
    ELECTRICIAN = "electrician", "Electrician"
    PLUMBER = "plumber", "Plumber"
    STEEL_FIXER = "steel_fixer", "Steel Fixer"
    CARPENTER = "carpenter", "Carpenter"
    ENGINEER = "engineer", "Engineer"
    FOREMAN = "foreman", "Foreman"
    LABOURER = "labourer", "Labourer"
    OTHER = "other", "Other"


class AttendanceEventType(models.TextChoices):
    CHECK_IN = "check_in", "Check In"
    CHECK_OUT = "check_out", "Check Out"
    BREAK_START = "break_start", "Break Start"
    BREAK_END = "break_end", "Break End"


class AttendanceMethod(models.TextChoices):
    QR_SCAN = "qr_scan", "QR Scan"
    MOBILE = "mobile", "Mobile"
    MANUAL = "manual", "Manual"


class AttendanceDayStatus(models.TextChoices):
    NOT_CHECKED_IN = "not_checked_in", "Not Checked In"
    PRESENT = "present", "Present"
    ABSENT = "absent", "Absent"
    LATE = "late", "Late"


class ProjectWorkerAssignment(TenantScopedModel):
    """Worker assigned to a project for attendance tracking."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="worker_assignments",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="worker_assignments",
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_assignments",
    )
    trade = models.CharField(max_length=32, choices=WorkerTrade.choices, default=WorkerTrade.OTHER)
    employee_code = models.CharField(max_length=50, blank=True)
    shift_start_time = models.TimeField(default="07:00")
    shift_end_time = models.TimeField(default="17:00")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("project", "worker")]
        ordering = ["worker__first_name", "worker__last_name"]

    def __str__(self):
        return f"{self.worker.email} @ {self.project.name}"


class CheckInPoint(TenantScopedModel):
    """Physical QR check-in location at a site."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="check_in_points",
    )
    site = models.ForeignKey(
        "companies.Site",
        on_delete=models.CASCADE,
        related_name="check_in_points",
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=32, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.site.name})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = secrets.token_urlsafe(8)
        super().save(*args, **kwargs)


class AttendanceEvent(TenantScopedModel):
    """Clock-in/out or break event for a worker on a project."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="attendance_events",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="attendance_events",
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_events",
    )
    event_type = models.CharField(max_length=16, choices=AttendanceEventType.choices)
    event_at = models.DateTimeField(db_index=True)
    work_date = models.DateField(db_index=True)

    check_in_point = models.ForeignKey(
        CheckInPoint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_events",
    )
    method = models.CharField(max_length=16, choices=AttendanceMethod.choices)
    is_late = models.BooleanField(default=False)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    notes = models.TextField(blank=True)

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_attendance_events",
    )
    is_offline_sync = models.BooleanField(default=False)
    client_event_id = models.CharField(max_length=64, blank=True, db_index=True)

    class Meta:
        ordering = ["-event_at"]
        indexes = [
            models.Index(fields=["project", "work_date"]),
            models.Index(fields=["worker", "work_date"]),
        ]

    def __str__(self):
        return f"{self.worker.email} {self.event_type} @ {self.event_at}"


class AttendanceManualMark(TenantScopedModel):
    """Manual present/absent override by a foreman or manager."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="attendance_manual_marks",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="attendance_manual_marks",
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_manual_marks",
    )
    work_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=AttendanceDayStatus.choices)
    notes = models.TextField(blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="marked_attendance_records",
    )

    class Meta:
        unique_together = [("project", "worker", "work_date")]
        ordering = ["-work_date"]

    def __str__(self):
        return f"{self.worker.email} — {self.work_date} ({self.status})"
