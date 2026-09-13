"""Production settings."""

from .base import *  # noqa: F403

DEBUG = False

# No GIS fields in this app — skip GeoDjango so Render does not need GDAL/PostGIS.
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "django.contrib.gis"]  # noqa: F405
DATABASES["default"]["ENGINE"] = "django.db.backends.postgresql"  # noqa: F405

# Ignore a leftover local Redis URL (localhost:6379) from copied .env files.
_redis = (REDIS_URL or "").strip()  # noqa: F405
if not _redis or "localhost" in _redis or "127.0.0.1" in _redis:
    REDIS_URL = ""
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
    CELERY_BROKER_URL = "memory://"
    CELERY_RESULT_BACKEND = "cache+memory://"
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

LOGGING["handlers"] = {  # noqa: F405
    "console": {
        "class": "logging.StreamHandler",
        "formatter": "verbose",
    },
}
LOGGING["root"]["handlers"] = ["console"]  # noqa: F405
LOGGING["loggers"]["django"]["handlers"] = ["console"]  # noqa: F405
LOGGING["loggers"]["apps"]["handlers"] = ["console"]  # noqa: F405

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
]
