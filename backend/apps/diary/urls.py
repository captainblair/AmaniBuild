"""Site diary URL routes."""

from django.urls import path

from apps.diary.views import (
    DiaryEntryApproveView,
    DiaryEntryDetailView,
    DiaryEntrySubmitView,
    ProjectDiaryEntryListCreateView,
    ProjectDiaryInsightsView,
    ProjectDiaryTimelineView,
)

urlpatterns = [
    path(
        "projects/<uuid:project_id>/diary-entries/",
        ProjectDiaryEntryListCreateView.as_view(),
        name="project-diary-entries",
    ),
    path(
        "projects/<uuid:project_id>/diary-entries/timeline/",
        ProjectDiaryTimelineView.as_view(),
        name="project-diary-timeline",
    ),
    path(
        "projects/<uuid:project_id>/diary-insights/",
        ProjectDiaryInsightsView.as_view(),
        name="project-diary-insights",
    ),
    path(
        "diary-entries/<uuid:entry_id>/",
        DiaryEntryDetailView.as_view(),
        name="diary-entry-detail",
    ),
    path(
        "diary-entries/<uuid:entry_id>/submit/",
        DiaryEntrySubmitView.as_view(),
        name="diary-entry-submit",
    ),
    path(
        "diary-entries/<uuid:entry_id>/approve/",
        DiaryEntryApproveView.as_view(),
        name="diary-entry-approve",
    ),
]
