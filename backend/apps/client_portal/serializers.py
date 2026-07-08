"""Client portal API serializers."""

from rest_framework import serializers


class ClientAccessGrantSerializer(serializers.Serializer):
    client_user_id = serializers.UUIDField()
    can_view_budget = serializers.BooleanField(required=False, default=True)


class ClientAccessListSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    client_user_id = serializers.UUIDField()
    client_user_name = serializers.CharField()
    client_user_email = serializers.EmailField()
    can_view_budget = serializers.BooleanField()
    is_active = serializers.BooleanField()
    granted_at = serializers.DateTimeField()
