"""Seed default subscription plans."""

from django.db import migrations


def seed_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model("companies", "SubscriptionPlan")
    plans = [
        {
            "code": "free",
            "name": "Free",
            "description": "1 project, basic attendance & diary, limited users.",
            "price_kes_monthly": 0,
            "max_projects": 1,
            "max_users": 5,
            "max_storage_gb": 2,
            "sort_order": 1,
        },
        {
            "code": "starter",
            "name": "Starter",
            "description": "Multiple projects, inventory, basic reports.",
            "price_kes_monthly": 3500,
            "max_projects": 5,
            "max_users": 15,
            "max_storage_gb": 10,
            "sort_order": 2,
        },
        {
            "code": "professional",
            "name": "Professional",
            "description": "Full modules, advanced analytics, API access.",
            "price_kes_monthly": 12000,
            "max_projects": 25,
            "max_users": 50,
            "max_storage_gb": 50,
            "sort_order": 3,
        },
        {
            "code": "enterprise",
            "name": "Enterprise",
            "description": "Custom volume, white-label, dedicated support.",
            "price_kes_monthly": 0,
            "max_projects": 999,
            "max_users": 999,
            "max_storage_gb": 500,
            "sort_order": 4,
        },
    ]
    for plan in plans:
        SubscriptionPlan.objects.update_or_create(code=plan["code"], defaults=plan)


def unseed_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model("companies", "SubscriptionPlan")
    SubscriptionPlan.objects.filter(
        code__in=["free", "starter", "professional", "enterprise"]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("companies", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_plans, unseed_plans),
    ]
