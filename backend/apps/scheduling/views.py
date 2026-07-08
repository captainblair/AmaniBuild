"""Scheduling API views."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanManageSchedule, CanViewSchedule
from apps.core.exceptions import AmaniBuildAPIException
from apps.diary.services import get_project_for_company
from apps.scheduling.models import ScheduleDependency, ScheduleItem, SchedulePhase
from apps.scheduling.serializers import (
    ScheduleDependencySerializer,
    ScheduleItemCreateUpdateSerializer,
    SchedulePhaseSerializer,
)
from apps.scheduling.services import (
    create_dependency,
    create_schedule_item,
    create_schedule_phase,
    delete_dependency,
    get_gantt_chart,
    get_schedule_dashboard,
    sync_item_from_linked_task,
    update_schedule_item,
)


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _get_item_or_404(company, item_id) -> ScheduleItem:
    item = ScheduleItem.objects.filter(company=company, id=item_id, is_deleted=False).select_related("phase", "assignee").first()
    if not item:
        raise AmaniBuildAPIException("Schedule item not found.", code="not_found")
    return item


class ProjectScheduleGanttView(APIView):
    permission_classes = [IsAuthenticated, CanViewSchedule]

    @extend_schema(tags=["Scheduling"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        return _success({"gantt": get_gantt_chart(project)})


class ProjectScheduleDashboardView(APIView):
    permission_classes = [IsAuthenticated, CanViewSchedule]

    @extend_schema(tags=["Scheduling"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        return _success({"dashboard": get_schedule_dashboard(project)})


class ProjectSchedulePhaseListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageSchedule()]
        return [IsAuthenticated(), CanViewSchedule()]

    @extend_schema(tags=["Scheduling"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        phases = SchedulePhase.objects.filter(company=request.company, project=project, is_deleted=False)
        return _success(
            {
                "phases": [
                    {"id": str(p.id), "name": p.name, "color": p.color, "sort_order": p.sort_order}
                    for p in phases
                ]
            }
        )

    @extend_schema(tags=["Scheduling"])
    def post(self, request, project_id):
        serializer = SchedulePhaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_project_for_company(request.company, project_id)
        phase = create_schedule_phase(company=request.company, project=project, data=serializer.validated_data)
        return _success(
            {"phase": {"id": str(phase.id), "name": phase.name, "color": phase.color, "sort_order": phase.sort_order}},
            status_code=status.HTTP_201_CREATED,
        )


class ProjectScheduleItemListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageSchedule()]
        return [IsAuthenticated(), CanViewSchedule()]

    @extend_schema(tags=["Scheduling"])
    def post(self, request, project_id):
        serializer = ScheduleItemCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_project_for_company(request.company, project_id)
        item = create_schedule_item(
            company=request.company,
            project=project,
            user=request.user,
            data=serializer.validated_data,
        )
        from apps.scheduling.services import _serialize_item

        return _success({"item": _serialize_item(item)}, status_code=status.HTTP_201_CREATED)


class ScheduleItemDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewSchedule()]
        return [IsAuthenticated(), CanManageSchedule()]

    @extend_schema(tags=["Scheduling"])
    def get(self, request, item_id):
        item = _get_item_or_404(request.company, item_id)
        from apps.scheduling.services import _serialize_item

        return _success({"item": _serialize_item(item)})

    @extend_schema(tags=["Scheduling"])
    def patch(self, request, item_id):
        item = _get_item_or_404(request.company, item_id)
        serializer = ScheduleItemCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = update_schedule_item(item, serializer.validated_data)
        from apps.scheduling.services import _serialize_item

        return _success({"item": _serialize_item(item)})

    @extend_schema(tags=["Scheduling"])
    def delete(self, request, item_id):
        item = _get_item_or_404(request.company, item_id)
        item.soft_delete()
        return _success({"deleted": True})


class ScheduleDependencyCreateView(APIView):
    permission_classes = [IsAuthenticated, CanManageSchedule]

    @extend_schema(tags=["Scheduling"])
    def post(self, request, project_id):
        serializer = ScheduleDependencySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        get_project_for_company(request.company, project_id)
        dependency = create_dependency(company=request.company, **serializer.validated_data)
        return _success(
            {
                "dependency": {
                    "id": dependency.id,
                    "predecessor_id": str(dependency.predecessor_id),
                    "successor_id": str(dependency.successor_id),
                    "dependency_type": dependency.dependency_type,
                    "lag_days": dependency.lag_days,
                }
            },
            status_code=status.HTTP_201_CREATED,
        )


class ScheduleDependencyDeleteView(APIView):
    permission_classes = [IsAuthenticated, CanManageSchedule]

    @extend_schema(tags=["Scheduling"])
    def delete(self, request, dependency_id):
        delete_dependency(request.company, dependency_id)
        return _success({"deleted": True})


class ScheduleItemSyncTaskView(APIView):
    permission_classes = [IsAuthenticated, CanManageSchedule]

    @extend_schema(tags=["Scheduling"])
    def post(self, request, item_id):
        item = _get_item_or_404(request.company, item_id)
        item = sync_item_from_linked_task(item)
        from apps.scheduling.services import _serialize_item

        return _success({"item": _serialize_item(item)})
