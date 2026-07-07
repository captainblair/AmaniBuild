"""Attendance API views."""

from datetime import datetime

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.attendance.models import AttendanceEventType, AttendanceMethod, ProjectWorkerAssignment
from apps.attendance.serializers import (
    AttendanceClockSerializer,
    AttendanceManualMarkSerializer,
    AttendanceQRScanSerializer,
    CheckInPointCreateSerializer,
    CheckInPointSerializer,
    WorkerAssignmentCreateSerializer,
    WorkerAssignmentSerializer,
)
from apps.attendance.services import (
    assert_company_worker,
    get_attendance_analytics,
    get_attendance_dashboard,
    get_check_in_point,
    get_project_for_company,
    get_worker_attendance_history,
    get_worker_today_activity,
    manual_mark_attendance,
    record_attendance_event,
    validate_site_for_company,
)
from apps.companies.models import Site
from apps.companies.permissions import CanManageAttendance, CanViewAttendance, HasCompanyAccess
from apps.core.exceptions import AmaniBuildAPIException

User = get_user_model()


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _parse_work_date(request) -> datetime.date:
    date_param = request.query_params.get("date")
    if date_param:
        return datetime.strptime(date_param, "%Y-%m-%d").date()
    return timezone.localdate()


def _assert_check_in_point_for_project(project, point) -> None:
    if project.site_id and point.site_id != project.site_id:
        raise AmaniBuildAPIException(
            "Check-in point does not belong to this project's site.",
            code="invalid_check_in_point",
        )


class ProjectWorkerAssignmentListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageAttendance()]
        return [IsAuthenticated(), CanViewAttendance()]

    @extend_schema(tags=["Attendance"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        assignments = ProjectWorkerAssignment.objects.filter(
            project=project,
            is_deleted=False,
        ).select_related("worker")
        return _success({"assignments": WorkerAssignmentSerializer(assignments, many=True).data})

    @extend_schema(request=WorkerAssignmentCreateSerializer, tags=["Attendance"])
    def post(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        serializer = WorkerAssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        worker = User.objects.filter(id=data["worker_id"]).first()
        if not worker:
            raise AmaniBuildAPIException("Worker not found.", code="not_found")
        assert_company_worker(request.company, worker)

        assignment, created = ProjectWorkerAssignment.objects.get_or_create(
            project=project,
            worker=worker,
            defaults={
                "company": request.company,
                "trade": data.get("trade", "other"),
                "employee_code": data.get("employee_code", ""),
                "shift_start_time": data.get("shift_start_time", "07:00"),
                "shift_end_time": data.get("shift_end_time", "17:00"),
                "is_active": True,
            },
        )
        if not created:
            assignment.is_active = True
            assignment.is_deleted = False
            assignment.deleted_at = None
            if "trade" in data:
                assignment.trade = data["trade"]
            assignment.save()

        return _success(
            {"assignment": WorkerAssignmentSerializer(assignment).data},
            status.HTTP_201_CREATED,
        )


class SiteCheckInPointListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageAttendance()]
        return [IsAuthenticated(), CanViewAttendance()]

    @extend_schema(tags=["Attendance"])
    def get(self, request, site_id):
        site = Site.objects.filter(company=request.company, id=site_id, is_deleted=False).first()
        if not site:
            raise AmaniBuildAPIException("Site not found.", code="not_found")
        points = site.check_in_points.filter(is_deleted=False)
        return _success({"check_in_points": CheckInPointSerializer(points, many=True).data})

    @extend_schema(request=CheckInPointCreateSerializer, tags=["Attendance"])
    def post(self, request, site_id):
        site = Site.objects.filter(company=request.company, id=site_id, is_deleted=False).first()
        if not site:
            raise AmaniBuildAPIException("Site not found.", code="not_found")
        validate_site_for_company(request.company, site)

        serializer = CheckInPointCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        point = site.check_in_points.create(
            company=request.company,
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
        )
        return _success({"check_in_point": CheckInPointSerializer(point).data}, status.HTTP_201_CREATED)


class ProjectAttendanceDashboardView(APIView):
    permission_classes = [IsAuthenticated, CanViewAttendance]

    @extend_schema(tags=["Attendance"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        work_date = _parse_work_date(request)
        return _success({"dashboard": get_attendance_dashboard(project, work_date)})


class ProjectAttendanceAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, CanViewAttendance]

    @extend_schema(tags=["Attendance"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        date_from = request.query_params.get("date_from") or timezone.localdate().replace(day=1).isoformat()
        date_to = request.query_params.get("date_to") or timezone.localdate().isoformat()
        analytics = get_attendance_analytics(
            project,
            datetime.strptime(date_from, "%Y-%m-%d").date(),
            datetime.strptime(date_to, "%Y-%m-%d").date(),
        )
        return _success({"analytics": analytics})


class ProjectAttendanceMarkView(APIView):
    permission_classes = [IsAuthenticated, CanManageAttendance]

    @extend_schema(request=AttendanceManualMarkSerializer, tags=["Attendance"])
    def post(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        serializer = AttendanceManualMarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        worker = User.objects.filter(id=data["worker_id"]).first()
        if not worker:
            raise AmaniBuildAPIException("Worker not found.", code="not_found")

        mark = manual_mark_attendance(
            company=request.company,
            project=project,
            worker=worker,
            work_date=data["work_date"],
            status=data["status"],
            marked_by=request.user,
            notes=data.get("notes", ""),
        )
        return _success({"mark": {"id": str(mark.id), "status": mark.status, "work_date": mark.work_date.isoformat()}})


class AttendanceClockView(APIView):
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    @extend_schema(request=AttendanceClockSerializer, tags=["Attendance"])
    def post(self, request):
        serializer = AttendanceClockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        project = get_project_for_company(request.company, data["project_id"])
        check_in_point = None
        method = AttendanceMethod.MOBILE
        if data.get("check_in_point_code"):
            check_in_point = get_check_in_point(request.company, data["check_in_point_code"])
            _assert_check_in_point_for_project(project, check_in_point)
            method = AttendanceMethod.QR_SCAN

        event, warning = record_attendance_event(
            company=request.company,
            project=project,
            worker=request.user,
            event_type=data["event_type"],
            method=method,
            event_at=data.get("event_at"),
            check_in_point=check_in_point,
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            notes=data.get("notes", ""),
            is_offline_sync=data.get("is_offline_sync", False),
            client_event_id=data.get("client_event_id", ""),
        )

        payload = {"activity": get_worker_today_activity(project, request.user)}
        if warning:
            payload["warning"] = warning
        if event:
            payload["event_id"] = str(event.id)
        return _success(payload, status.HTTP_201_CREATED if event else status.HTTP_200_OK)


class AttendanceQRScanView(APIView):
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    @extend_schema(request=AttendanceQRScanSerializer, tags=["Attendance"])
    def post(self, request):
        serializer = AttendanceQRScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        project = get_project_for_company(request.company, data["project_id"])
        check_in_point = get_check_in_point(request.company, data["check_in_point_code"])
        _assert_check_in_point_for_project(project, check_in_point)

        event, warning = record_attendance_event(
            company=request.company,
            project=project,
            worker=request.user,
            event_type=AttendanceEventType.CHECK_IN,
            method=AttendanceMethod.QR_SCAN,
            event_at=data.get("event_at"),
            check_in_point=check_in_point,
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            is_offline_sync=data.get("is_offline_sync", False),
            client_event_id=data.get("client_event_id", ""),
        )

        recent_scans = []
        if event:
            recent = (
                project.attendance_events.filter(
                    check_in_point=check_in_point,
                    event_type=AttendanceEventType.CHECK_IN,
                    is_deleted=False,
                )
                .select_related("worker")
                .order_by("-event_at")[:5]
            )
            recent_scans = [
                {
                    "worker_name": item.worker.full_name,
                    "event_at": item.event_at.isoformat(),
                    "location": check_in_point.name,
                }
                for item in recent
            ]

        payload = {
            "activity": get_worker_today_activity(project, request.user),
            "recent_scans": recent_scans,
        }
        if warning:
            payload["warning"] = warning
        if event:
            payload["event_id"] = str(event.id)
        return _success(payload, status.HTTP_201_CREATED if event else status.HTTP_200_OK)


class AttendanceMeTodayView(APIView):
    permission_classes = [IsAuthenticated, HasCompanyAccess]

    @extend_schema(tags=["Attendance"])
    def get(self, request):
        project_id = request.query_params.get("project_id")
        if not project_id:
            raise AmaniBuildAPIException("project_id is required.", code="project_required")
        project = get_project_for_company(request.company, project_id)
        work_date = _parse_work_date(request)
        return _success({"activity": get_worker_today_activity(project, request.user, work_date)})


class WorkerAttendanceHistoryView(APIView):
    permission_classes = [IsAuthenticated, CanViewAttendance]

    @extend_schema(tags=["Attendance"])
    def get(self, request, project_id, worker_id):
        project = get_project_for_company(request.company, project_id)
        worker = User.objects.filter(id=worker_id).first()
        if not worker:
            raise AmaniBuildAPIException("Worker not found.", code="not_found")

        date_from = request.query_params.get("date_from") or timezone.localdate().replace(day=1).isoformat()
        date_to = request.query_params.get("date_to") or timezone.localdate().isoformat()
        history = get_worker_attendance_history(
            project,
            worker,
            datetime.strptime(date_from, "%Y-%m-%d").date(),
            datetime.strptime(date_to, "%Y-%m-%d").date(),
        )
        return _success({"history": history})
