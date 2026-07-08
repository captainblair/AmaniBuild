"""Task serializers."""

from rest_framework import serializers

from apps.tasks.models import Task, TaskComment, TaskPriority, TaskStatus


class TaskUserSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField(required=False, allow_null=True)


class TaskCommentSerializer(serializers.ModelSerializer):
    author = TaskUserSummarySerializer(read_only=True)

    class Meta:
        model = TaskComment
        fields = ["id", "body", "attachments", "author", "created_at"]
        read_only_fields = fields


class TaskCommentCreateSerializer(serializers.Serializer):
    body = serializers.CharField()
    attachments = serializers.ListField(child=serializers.DictField(), required=False)


class TaskBoardCardSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source="assignee.full_name", read_only=True, default=None)
    assignee_role = serializers.SerializerMethodField()
    project_name = serializers.CharField(source="project.name", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_due_today = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "priority",
            "due_date",
            "assignee",
            "assignee_name",
            "assignee_role",
            "project",
            "project_name",
            "board_position",
            "is_overdue",
            "is_due_today",
            "comment_count",
        ]

    def get_assignee_role(self, obj) -> str | None:
        if not obj.assignee_id:
            return None
        membership = obj.assignee.company_memberships.filter(
            company=obj.company,
            is_active=True,
            is_deleted=False,
        ).first()
        if membership:
            return membership.get_role_display()
        return None


class TaskListSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source="assignee.full_name", read_only=True, default=None)
    project_name = serializers.CharField(source="project.name", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_due_today = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "priority",
            "due_date",
            "assignee",
            "assignee_name",
            "project",
            "project_name",
            "is_overdue",
            "is_due_today",
            "comment_count",
            "created_at",
        ]


class TaskSerializer(serializers.ModelSerializer):
    assignee = TaskUserSummarySerializer(read_only=True)
    created_by = TaskUserSummarySerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    site_name = serializers.CharField(source="project.site.name", read_only=True, default=None)
    is_overdue = serializers.BooleanField(read_only=True)
    is_due_today = serializers.BooleanField(read_only=True)
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_name",
            "site_name",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "assignee",
            "created_by",
            "completed_at",
            "board_position",
            "attachments",
            "is_overdue",
            "is_due_today",
            "comment_count",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "completed_at",
            "created_by",
            "comment_count",
            "comments",
            "created_at",
            "updated_at",
        ]

    def get_comments(self, obj):
        comments = obj.comments.filter(is_deleted=False).select_related("author")
        return TaskCommentSerializer(comments, many=True).data


class TaskCreateUpdateSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=False)
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=TaskStatus.choices, required=False)
    priority = serializers.ChoiceField(choices=TaskPriority.choices, required=False)
    due_date = serializers.DateField(required=False, allow_null=True)
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    board_position = serializers.IntegerField(required=False, min_value=0)
    attachments = serializers.ListField(child=serializers.DictField(), required=False)


class TaskStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TaskStatus.choices)
    board_position = serializers.IntegerField(required=False, min_value=0)
