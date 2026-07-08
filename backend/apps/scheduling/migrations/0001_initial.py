# Generated manually for Phase 17

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("companies", "0003_teaminvitation"),
        ("projects", "0001_initial"),
        ("tasks", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SchedulePhase",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("name", models.CharField(max_length=255)),
                ("color", models.CharField(default="#F97316", max_length=16)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_phases",
                        to="companies.company",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_phases",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order", "name"],
                "unique_together": {("project", "name")},
            },
        ),
        migrations.CreateModel(
            name="ScheduleItem",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("start_date", models.DateField(db_index=True)),
                ("end_date", models.DateField(db_index=True)),
                ("progress_percent", models.PositiveSmallIntegerField(default=0)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("not_started", "Not Started"),
                            ("in_progress", "In Progress"),
                            ("completed", "Completed"),
                            ("delayed", "Delayed"),
                            ("on_hold", "On Hold"),
                        ],
                        db_index=True,
                        default="not_started",
                        max_length=16,
                    ),
                ),
                ("color", models.CharField(blank=True, max_length=16)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_milestone", models.BooleanField(default=False)),
                (
                    "assignee",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="schedule_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_items",
                        to="companies.company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_schedule_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "linked_task",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="schedule_items",
                        to="tasks.task",
                    ),
                ),
                (
                    "phase",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="items",
                        to="scheduling.schedulephase",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule_items",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order", "start_date", "title"],
                "indexes": [
                    models.Index(fields=["company", "project", "start_date"], name="scheduling_company_1a2b3c_idx"),
                    models.Index(fields=["project", "status"], name="scheduling_project_4d5e6f_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="ScheduleDependency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "dependency_type",
                    models.CharField(
                        choices=[
                            ("finish_to_start", "Finish to Start"),
                            ("start_to_start", "Start to Start"),
                            ("finish_to_finish", "Finish to Finish"),
                            ("start_to_finish", "Start to Finish"),
                        ],
                        default="finish_to_start",
                        max_length=20,
                    ),
                ),
                ("lag_days", models.IntegerField(default=0)),
                (
                    "predecessor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="successor_links",
                        to="scheduling.scheduleitem",
                    ),
                ),
                (
                    "successor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="predecessor_links",
                        to="scheduling.scheduleitem",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["predecessor"], name="scheduling_predece_7g8h9i_idx"),
                    models.Index(fields=["successor"], name="scheduling_success_j0k1l2_idx"),
                ],
                "unique_together": {("predecessor", "successor")},
            },
        ),
    ]
