"""Local development settings."""

from .base import *  # noqa: F403

DEBUG = True

INSTALLED_APPS += ["django_extensions"] if False else []  # noqa: F405

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
