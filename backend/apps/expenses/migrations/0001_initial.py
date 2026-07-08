# Generated manually for Phase 15

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
            name="Expense",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("expense_number", models.CharField(db_index=True, max_length=32)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("materials", "Materials"),
                            ("labour", "Labour"),
                            ("transport", "Transport"),
                            ("fuel", "Fuel"),
                            ("meals", "Meals & Subsistence"),
                            ("equipment", "Equipment Hire"),
                            ("utilities", "Utilities"),
                            ("subcontractor", "Subcontractor"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="other",
                        max_length=32,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("tax_amount", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("currency", models.CharField(default="KES", max_length=3)),
                ("expense_date", models.DateField(db_index=True)),
                ("vendor_name", models.CharField(blank=True, max_length=255)),
                (
                    "payment_method",
                    models.CharField(
                        choices=[
                            ("cash", "Cash"),
                            ("mpesa", "M-Pesa"),
                            ("bank_transfer", "Bank Transfer"),
                            ("card", "Card"),
                            ("other", "Other"),
                        ],
                        default="cash",
                        max_length=20,
                    ),
                ),
                ("reference_number", models.CharField(blank=True, max_length=64)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("submitted", "Submitted"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("reimbursed", "Reimbursed"),
                        ],
                        db_index=True,
                        default="draft",
                        max_length=16,
                    ),
                ),
                ("receipt_photos", models.JSONField(blank=True, default=list)),
                ("notes", models.TextField(blank=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("rejected_at", models.DateTimeField(blank=True, null=True)),
                ("rejection_reason", models.TextField(blank=True)),
                ("reimbursed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="approved_expenses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="expenses",
                        to="companies.company",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="expenses",
                        to="projects.project",
                    ),
                ),
                (
                    "recorded_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="recorded_expenses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-expense_date", "-created_at"],
                "indexes": [
                    models.Index(fields=["company", "status"], name="expenses_company_1a2b3c_idx"),
                    models.Index(fields=["company", "category"], name="expenses_company_4d5e6f_idx"),
                    models.Index(fields=["project", "expense_date"], name="expenses_project_7g8h9i_idx"),
                ],
                "unique_together": {("company", "expense_number")},
            },
        ),
    ]
