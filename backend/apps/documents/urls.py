"""Documents and photos URL routes."""

from django.urls import path

from apps.documents.views import (
    LibraryFileUploadView,
    LibraryFoldersView,
    LibraryItemDetailView,
    LibraryItemVersionsView,
    LibraryListCreateView,
    PhotosTimelineView,
)

urlpatterns = [
    path("documents/", LibraryListCreateView.as_view(), name="library-list"),
    path("documents/upload/", LibraryFileUploadView.as_view(), name="library-upload"),
    path("documents/folders/", LibraryFoldersView.as_view(), name="library-folders"),
    path("documents/photos/", PhotosTimelineView.as_view(), name="library-photos"),
    path("documents/<uuid:item_id>/", LibraryItemDetailView.as_view(), name="library-detail"),
    path("documents/<uuid:item_id>/versions/", LibraryItemVersionsView.as_view(), name="library-versions"),
]

