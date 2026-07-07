"""Standardized API error responses."""

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Wrap DRF errors in a consistent envelope."""
    response = exception_handler(exc, context)

    if response is None:
        return response

    error_code = "error"
    if isinstance(exc, APIException) and exc.default_code:
        error_code = exc.default_code

    response.data = {
        "success": False,
        "error": {
            "code": error_code,
            "message": _extract_message(response.data),
            "details": response.data if isinstance(response.data, dict) else {"non_field_errors": response.data},
        },
    }
    return response


def _extract_message(data):
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        for value in data.values():
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str):
                return value
    if isinstance(data, list) and data:
        return str(data[0])
    return "An error occurred."


class AmaniBuildAPIException(APIException):
    """Base exception with explicit error codes for clients."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "bad_request"

    def __init__(self, detail=None, code=None):
        if code:
            self.default_code = code
        super().__init__(detail=detail, code=code or self.default_code)
