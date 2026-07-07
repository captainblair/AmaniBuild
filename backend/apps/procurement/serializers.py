"""Procurement serializers."""

from rest_framework import serializers

from apps.procurement.models import PurchaseCategory, PurchaseRequest, PurchaseRequestLine


class PurchaseRequestLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseRequestLine
        fields = ["id", "description", "quantity", "unit", "unit_price", "amount", "sort_order"]
        read_only_fields = ["id", "amount"]


class PurchaseRequestLineInputSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=1)
    unit = serializers.CharField(max_length=32, required=False, default="unit")
    unit_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)


class PurchaseRequestListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = [
            "id",
            "request_number",
            "title",
            "category",
            "status",
            "total_amount",
            "currency",
            "project",
            "project_name",
            "requested_by_name",
            "submitted_at",
            "created_at",
        ]


class ApprovalStepSerializer(serializers.Serializer):
    step_type = serializers.CharField()
    status = serializers.CharField()
    acted_by_name = serializers.CharField(allow_null=True)
    acted_at = serializers.DateTimeField(allow_null=True)
    notes = serializers.CharField(allow_blank=True)


class PurchaseRequestSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True)
    lines = PurchaseRequestLineSerializer(many=True, read_only=True)
    approval_steps = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = [
            "id",
            "request_number",
            "title",
            "category",
            "justification",
            "status",
            "currency",
            "total_amount",
            "project",
            "project_name",
            "requested_by",
            "requested_by_name",
            "lines",
            "attachments",
            "supplier_quotes",
            "approval_steps",
            "submitted_at",
            "approved_at",
            "rejected_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "request_number",
            "status",
            "total_amount",
            "requested_by",
            "submitted_at",
            "approved_at",
            "rejected_at",
            "created_at",
            "updated_at",
        ]

    def get_approval_steps(self, obj):
        steps = obj.approval_steps.select_related("acted_by").all()
        return [
            {
                "step_type": step.step_type,
                "status": step.status,
                "acted_by_name": step.acted_by.full_name if step.acted_by else None,
                "acted_at": step.acted_at,
                "notes": step.notes,
            }
            for step in steps
        ]


class PurchaseRequestCreateUpdateSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255)
    category = serializers.ChoiceField(choices=PurchaseCategory.choices, required=False)
    justification = serializers.CharField(required=False, allow_blank=True)
    currency = serializers.CharField(max_length=3, required=False, default="KES")
    lines = PurchaseRequestLineInputSerializer(many=True)
    attachments = serializers.ListField(child=serializers.DictField(), required=False)
    supplier_quotes = serializers.ListField(child=serializers.DictField(), required=False)


class PurchaseRequestRejectSerializer(serializers.Serializer):
    reason = serializers.CharField()


class PurchaseRequestApproveSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
