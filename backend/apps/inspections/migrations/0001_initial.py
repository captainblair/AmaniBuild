# Generated manually for Phase 14

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("companies", "0003_teaminvitation"),
        ("projects", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Inspection",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("inspection_number", models.CharField(db_index=True, max_length=32)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "inspection_type",
                    models.CharField(
                        choices=[
                            ("general", "General QA"),
                            ("structural", "Structural"),
                            ("electrical", "Electrical"),
                            ("plumbing", "Plumbing"),
                            ("finishing", "Finishing"),
                            ("safety", "Safety"),
                            ("mep", "MEP"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="general",
                        max_length=32,
                    ),
                ),
                ("area_location", models.CharField(blank=True, max_length=255)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("scheduled", "Scheduled"),
                            ("in_progress", "In Progress"),
                            ("submitted", "Submitted"),
                            ("passed", "Passed"),
                            ("failed", "Failed"),
                        ],
                        db_index=True,
                        default="draft",
                        max_length=16,
                    ),
                ),
                (
                    "result",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("pass", "Pass"),
                            ("fail", "Fail"),
                            ("conditional_pass", "Conditional Pass"),
                        ],
                        max_length=20,
                        null=True,
                    ),
                ),
                ("score_percent", models.PositiveSmallIntegerField(default=0)),
                ("checklist_items", models.JSONField(blank=True, default=list)),
                ("findings", models.JSONField(blank=True, default=list)),
                ("photos", models.JSONField(blank=True, default=list)),
                ("scheduled_date", models.DateField(blank=True, null=True)),
                ("inspected_at", models.DateTimeField(blank=True, null=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inspections",
                        to="companies.company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_inspections",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "inspector",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_inspections",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inspections",
                        to="projects.project",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_inspections",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-scheduled_date", "-created_at"],
                "indexes": [
                    models.Index(fields=["company", "status"], name="inspections_company_8f2a1b_idx"),
                    models.Index(fields=["company", "inspection_type"], name="inspections_company_3c4d5e_idx"),
                    models.Index(fields=["project", "status"], name="inspections_project_6a7b8c_idx"),
                ],
                "unique_together": {("company", "inspection_number")},
            },
        ),
    ]
