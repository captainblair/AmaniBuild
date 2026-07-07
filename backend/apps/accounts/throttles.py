"""Auth endpoint rate limits."""

from rest_framework.throttling import AnonRateThrottle


class AuthAnonThrottle(AnonRateThrottle):
    scope = "auth"
