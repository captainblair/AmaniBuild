"""No-Docker local settings — SQLite, no PostGIS/GDAL/Redis."""

from .base import *  # noqa: F403

DEBUG = True
AMANIBUILD_EXPOSE_OTP = True
AMANIBUILD_EXPOSE_INVITE_TOKEN = True

INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "django.contrib.gis"]  # noqa: F405

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
