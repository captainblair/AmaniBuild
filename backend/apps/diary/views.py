"""Site diary API views."""

from collections import defaultdict

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.companies.permissions import CanApproveDiary, CanManageDiary, CanViewDiary
from apps.core.exceptions import AmaniBuildAPIException
from apps.core.pagination import StandardResultsPagination
from apps.diary.models import SiteDiaryEntry, WeatherCondition
from apps.diary.serializers import (
    SiteDiaryEntryCreateUpdateSerializer,
    SiteDiaryEntryListSerializer,
    SiteDiaryEntrySerializer,
)
from apps.diary.services import (
    approve_diary_entry,
    assert_editable,
    assert_unique_entry_date,
    assert_valid_supervisor,
    get_project_diary_insights,
    get_project_for_company,
    submit_diary_entry,
)

User = get_user_model()


def _success(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _entry_queryset(company):
    return (
        SiteDiaryEntry.objects.filter(company=company, is_deleted=False)
        .select_related("project", "supervisor", "action_owner", "approved_by", "created_by")
        .order_by("-entry_date", "-created_at")
    )


def _get_entry_or_404(company, entry_id) -> SiteDiaryEntry:
    entry = _entry_queryset(company).filter(id=entry_id).first()
    if not entry:
        raise AmaniBuildAPIException("Diary entry not found.", code="not_found")
    return entry


def _resolve_user(company, user_id):
    if not user_id:
        return None
    user = User.objects.filter(id=user_id).first()
    if not user:
        raise AmaniBuildAPIException("User not found.", code="not_found")
    assert_valid_supervisor(company, user)
    return user


def _apply_entry_filters(queryset, request):
    status_filter = request.query_params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    date_from = request.query_params.get("date_from")
    if date_from:
        queryset = queryset.filter(entry_date__gte=date_from)

    date_to = request.query_params.get("date_to")
    if date_to:
        queryset = queryset.filter(entry_date__lte=date_to)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(work_description__icontains=search)
            | Q(delays__icontains=search)
            | Q(safety_concerns__icontains=search)
            | Q(required_actions__icontains=search)
        )

    return queryset


def _build_entry(company, project, user, data: dict) -> SiteDiaryEntry:
    assert_unique_entry_date(project, data["entry_date"])
    supervisor = _resolve_user(company, data.get("supervisor_id"))
    action_owner = _resolve_user(company, data.get("action_owner_id"))

    return SiteDiaryEntry.objects.create(
        company=company,
        project=project,
        entry_date=data["entry_date"],
        weather_condition=data.get("weather_condition", WeatherCondition.PARTLY_CLOUDY),
        weather_temperature_c=data.get("weather_temperature_c"),
        weather_humidity_percent=data.get("weather_humidity_percent"),
        weather_wind=data.get("weather_wind", ""),
        supervisor=supervisor,
        workforce_count=data.get("workforce_count", 0),
        working_hours=data.get("working_hours", 8),
        work_description=data.get("work_description", ""),
        progress_percent=data.get("progress_percent", 0),
        milestones=data.get("milestones", []),
        labour_activities=data.get("labour_activities", []),
        equipment_used=data.get("equipment_used", []),
        materials_consumed=data.get("materials_consumed", []),
        delays=data.get("delays", ""),
        safety_concerns=data.get("safety_concerns", ""),
        required_actions=data.get("required_actions", ""),
        action_owner=action_owner,
        site_conditions_notes=data.get("site_conditions_notes", ""),
        photos=data.get("photos", []),
        created_by=user,
    )


def _update_entry_fields(entry: SiteDiaryEntry, company, data: dict) -> SiteDiaryEntry:
    if "entry_date" in data:
        assert_unique_entry_date(entry.project, data["entry_date"], exclude_id=entry.id)
        entry.entry_date = data["entry_date"]

    if "supervisor_id" in data:
        entry.supervisor = _resolve_user(company, data.get("supervisor_id"))
    if "action_owner_id" in data:
        entry.action_owner = _resolve_user(company, data.get("action_owner_id"))

    scalar_fields = (
        "weather_condition",
        "weather_temperature_c",
        "weather_humidity_percent",
        "weather_wind",
        "workforce_count",
        "working_hours",
        "work_description",
        "progress_percent",
        "milestones",
        "labour_activities",
        "equipment_used",
        "materials_consumed",
        "delays",
        "safety_concerns",
        "required_actions",
        "site_conditions_notes",
        "photos",
    )
    for field in scalar_fields:
        if field in data:
            setattr(entry, field, data[field])

    entry.save()
    return entry


class ProjectDiaryEntryListCreateView(APIView):
    pagination_class = StandardResultsPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanManageDiary()]
        return [IsAuthenticated(), CanViewDiary()]

    @extend_schema(tags=["Site Diary"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        queryset = _apply_entry_filters(
            _entry_queryset(request.company).filter(project=project),
            request,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = SiteDiaryEntryListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=SiteDiaryEntryCreateUpdateSerializer, tags=["Site Diary"])
    def post(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        serializer = SiteDiaryEntryCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = _build_entry(request.company, project, request.user, serializer.validated_data)
        return _success({"entry": SiteDiaryEntrySerializer(entry).data}, status.HTTP_201_CREATED)


class ProjectDiaryTimelineView(APIView):
    permission_classes = [IsAuthenticated, CanViewDiary]

    @extend_schema(tags=["Site Diary"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        queryset = _apply_entry_filters(
            _entry_queryset(request.company).filter(project=project),
            request,
        )
        grouped: dict[str, list] = defaultdict(list)
        for entry in queryset:
            grouped[entry.entry_date.isoformat()].append(SiteDiaryEntryListSerializer(entry).data)

        timeline = [
            {"entry_date": entry_date, "entries": entries}
            for entry_date, entries in sorted(grouped.items(), reverse=True)
        ]
        return _success(
            {
                "timeline": timeline,
                "insights": get_project_diary_insights(project),
            }
        )


class ProjectDiaryInsightsView(APIView):
    permission_classes = [IsAuthenticated, CanViewDiary]

    @extend_schema(tags=["Site Diary"])
    def get(self, request, project_id):
        project = get_project_for_company(request.company, project_id)
        return _success({"insights": get_project_diary_insights(project)})


class DiaryEntryDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewDiary()]
        if self.request.method == "PATCH":
            return [IsAuthenticated(), CanManageDiary()]
        return [IsAuthenticated(), CanManageDiary()]

    @extend_schema(tags=["Site Diary"])
    def get(self, request, entry_id):
        entry = _get_entry_or_404(request.company, entry_id)
        return _success({"entry": SiteDiaryEntrySerializer(entry).data})

    @extend_schema(request=SiteDiaryEntryCreateUpdateSerializer, tags=["Site Diary"])
    def patch(self, request, entry_id):
        entry = _get_entry_or_404(request.company, entry_id)
        assert_editable(entry)
        serializer = SiteDiaryEntryCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        entry = _update_entry_fields(entry, request.company, serializer.validated_data)
        return _success({"entry": SiteDiaryEntrySerializer(entry).data})

    @extend_schema(tags=["Site Diary"])
    def delete(self, request, entry_id):
        entry = _get_entry_or_404(request.company, entry_id)
        assert_editable(entry)
        entry.soft_delete()
        return _success({"message": "Diary entry deleted."})


class DiaryEntrySubmitView(APIView):
    permission_classes = [IsAuthenticated, CanManageDiary]

    @extend_schema(tags=["Site Diary"])
    def post(self, request, entry_id):
        entry = _get_entry_or_404(request.company, entry_id)
        entry = submit_diary_entry(entry)
        return _success({"entry": SiteDiaryEntrySerializer(entry).data})


class DiaryEntryApproveView(APIView):
    permission_classes = [IsAuthenticated, CanApproveDiary]

    @extend_schema(tags=["Site Diary"])
    def post(self, request, entry_id):
        entry = _get_entry_or_404(request.company, entry_id)
        entry = approve_diary_entry(entry, request.user)
        return _success({"entry": SiteDiaryEntrySerializer(entry).data})
