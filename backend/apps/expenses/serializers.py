"""Expense API serializers."""

from rest_framework import serializers

from apps.expenses.models import Expense, ExpenseCategory, ExpenseStatus, PaymentMethod


class ExpenseListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True, default=None)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    receipt_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_number",
            "title",
            "category",
            "amount",
            "tax_amount",
            "total_amount",
            "currency",
            "expense_date",
            "vendor_name",
            "payment_method",
            "reference_number",
            "status",
            "receipt_count",
            "project",
            "project_name",
            "recorded_by",
            "recorded_by_name",
            "submitted_at",
            "approved_at",
            "created_at",
        ]


class ExpenseSerializer(ExpenseListSerializer):
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True, default=None)

    class Meta(ExpenseListSerializer.Meta):
        fields = ExpenseListSerializer.Meta.fields + [
            "description",
            "receipt_photos",
            "notes",
            "approved_by",
            "approved_by_name",
            "rejected_at",
            "rejection_reason",
            "reimbursed_at",
            "updated_at",
        ]


class ExpenseCreateUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.ChoiceField(choices=ExpenseCategory.choices, required=False)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    tax_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    currency = serializers.CharField(max_length=3, required=False, default="KES")
    expense_date = serializers.DateField()
    vendor_name = serializers.CharField(required=False, allow_blank=True, default="")
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, required=False)
    reference_number = serializers.CharField(required=False, allow_blank=True, default="")
    receipt_photos = serializers.ListField(child=serializers.DictField(), required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class ExpenseRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")
