"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentPreviewPanel } from "@/components/documents/DocumentPreviewPanel";
import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchLibraryFolders,
  fetchLibraryItems,
  fetchPhotoTimeline,
} from "@/lib/api/documents";
import { fetchProjects } from "@/lib/api/projects";
import type {
  LibraryFolder,
  LibraryItem,
  LibraryItemListItem,
  LibraryPhotoTimelineGroup,
  LibrarySummary,
  ProjectListItem,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import {
  buildFolderTree,
  documentTypeLabel,
  extensionBadge,
  formatFileSize,
  formatLibraryDate,
  formatMonthLabel,
  type FolderNode,
} from "@/lib/documents/labels";

const emptySummary: LibrarySummary = {
  total_items: 0,
  documents: 0,
  photos: 0,
  total_size_bytes: 0,
};

type SortKey = "date" | "name" | "size";
type ViewMode = "list" | "grid";

function FolderTree({
  nodes,
  selected,
  onSelect,
  depth = 0,
}: {
  nodes: FolderNode[];
  selected: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <ul className="doc-folders" style={{ paddingLeft: depth ? 12 : 0 }}>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const expanded = open[node.path] ?? depth < 1;
        const active = selected === node.path;
        return (
          <li key={node.path}>
            <button
              type="button"
              className={`doc-folders__item ${active ? "is-active" : ""}`}
              onClick={() => {
                onSelect(node.path);
                if (hasChildren) setOpen((prev) => ({ ...prev, [node.path]: !expanded }));
              }}
            >
              <span className="doc-folders__chevron">{hasChildren ? (expanded ? "▾" : "▸") : "·"}</span>
              <span className="doc-folders__name">{node.name}</span>
              <span className="doc-folders__count">{node.count}</span>
            </button>
            {hasChildren && expanded ? (
              <FolderTree nodes={node.children} selected={selected} onSelect={onSelect} depth={depth + 1} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_documents");
  const canView = membership.permissions.includes("view_documents");

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [folder, setFolder] = useState("");
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [items, setItems] = useState<LibraryItemListItem[]>([]);
  const [summary, setSummary] = useState<LibrarySummary>(emptySummary);
  const [timeline, setTimeline] = useState<LibraryPhotoTimelineGroup[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [view, setView] = useState<ViewMode>("list");
  const [mobilePane, setMobilePane] = useState<"folders" | "files">("folders");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        const fromQuery = searchParams.get("project");
        if (fromQuery && data.results.some((p) => p.id === fromQuery)) setProjectId(fromQuery);
      })
      .catch(() => setProjects([]));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage) {
      setUploadOpen(true);
      router.replace(projectId ? `/dashboard/documents?project=${projectId}` : "/dashboard/documents");
    }
  }, [searchParams, canManage, projectId, router]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view documents.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {
        page_size: 100,
        project_id: projectId || undefined,
        folder: folder || undefined,
        search: search.trim() || undefined,
      };
      const [list, folderRows, photos] = await Promise.all([
        fetchLibraryItems(params),
        fetchLibraryFolders({ project_id: projectId || undefined }),
        fetchPhotoTimeline({
          project_id: projectId || undefined,
          folder: folder || undefined,
          search: search.trim() || undefined,
        }),
      ]);
      setItems(list.results);
      setSummary(list.summary ?? emptySummary);
      setFolders(folderRows);
      setTimeline(photos);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load documents.");
    } finally {
      setLoading(false);
    }
  }, [canView, projectId, folder, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  const documents = useMemo(() => {
    const docs = items.filter((i) => i.asset_type !== "photo");
    const sorted = [...docs];
    sorted.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "size") return (b.size_bytes || 0) - (a.size_bytes || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [items, sort]);

  const showPhotos = !folder || folder.toLowerCase().startsWith("photos") || timeline.length > 0;
  const projectName = projects.find((p) => p.id === projectId)?.name;

  function onUploaded(item: LibraryItem) {
    setSelectedId(item.id);
    setMobilePane("files");
    void load();
  }

  if (!canView) {
    return (
      <div className="dash-panel p-8 text-center">
        <p className="text-sm text-[var(--gray-500)]">You do not have permission to view documents.</p>
      </div>
    );
  }

  return (
    <div className={`doc-page ${selectedId ? "doc-page--preview" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            {projectName || "Documents"}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            Project drawings, contracts, reports, and site photos.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setUploadOpen(true)}>
            Upload Document
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total files" value={String(summary.total_items)} />
        <KpiCard label="Documents" value={String(summary.documents)} />
        <KpiCard label="Photos" value={String(summary.photos)} />
        <KpiCard label="Library size" value={formatFileSize(summary.total_size_bytes)} />
      </div>

      {error ? <p className="doc-error">{error}</p> : null}

      <div className="doc-shell">
        <aside className={`doc-sidebar ${mobilePane === "folders" ? "is-mobile-open" : ""}`}>
          <div className="doc-sidebar__head">
            <h2>Folders</h2>
            <button type="button" className="doc-link" onClick={() => setFolder("")}>
              All files
            </button>
          </div>
          {folderTree.length ? (
            <FolderTree
              nodes={folderTree}
              selected={folder}
              onSelect={(path) => {
                setFolder(path);
                setMobilePane("files");
                setSelectedId(null);
              }}
            />
          ) : (
            <p className="doc-sidebar__empty">No folders yet. Upload a file to create one.</p>
          )}
        </aside>

        <section className={`doc-main ${mobilePane === "files" ? "is-mobile-open" : ""}`}>
          <div className="doc-toolbar dash-panel">
            <button
              type="button"
              className="doc-back lg:hidden"
              onClick={() => setMobilePane("folders")}
            >
              ← Folders
            </button>
            <input
              type="search"
              className="doc-toolbar__search"
              placeholder="Search files…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <select
              className="doc-select"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSelectedId(null);
              }}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select className="doc-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="date">Sort by date</option>
              <option value="name">Sort by name</option>
              <option value="size">Sort by size</option>
            </select>
            <div className="doc-view-toggle">
              <button
                type="button"
                className={view === "list" ? "is-active" : ""}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                List
              </button>
              <button
                type="button"
                className={view === "grid" ? "is-active" : ""}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                Grid
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner label="Loading library…" />
            </div>
          ) : (
            <>
              <div className="dash-panel overflow-hidden">
                <div className="doc-section-head">
                  <h2>{folder || "All documents"}</h2>
                  <span>{documents.length} files</span>
                </div>

                {documents.length === 0 ? (
                  <p className="doc-empty">No documents in this folder.</p>
                ) : view === "list" ? (
                  <div className="doc-table-wrap">
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Uploaded by</th>
                          <th>Date</th>
                          <th>Version</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((item) => (
                          <tr
                            key={item.id}
                            className={selectedId === item.id ? "is-selected" : undefined}
                            onClick={() => setSelectedId(item.id)}
                          >
                            <td>
                              <div className="doc-file-cell">
                                <span className="doc-ext">{extensionBadge(item.file_extension)}</span>
                                <span>{item.title}</span>
                              </div>
                            </td>
                            <td>{documentTypeLabel(item.document_type)}</td>
                            <td>{formatFileSize(item.size_bytes)}</td>
                            <td>
                              <div className="doc-user-cell">
                                <span className="doc-avatar">
                                  {(item.uploaded_by_name || "?")
                                    .split(" ")
                                    .map((p) => p[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                                {item.uploaded_by_name || "—"}
                              </div>
                            </td>
                            <td>{formatLibraryDate(item.created_at)}</td>
                            <td>{item.version}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="doc-grid">
                    {documents.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`doc-grid__card ${selectedId === item.id ? "is-selected" : ""}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span className="doc-ext">{extensionBadge(item.file_extension)}</span>
                        <strong>{item.title}</strong>
                        <span>
                          {formatFileSize(item.size_bytes)} · {item.version}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {showPhotos && timeline.length > 0 ? (
                <div className="dash-panel overflow-hidden">
                  {timeline.map((group) => (
                    <div key={group.month} className="doc-photos">
                      <div className="doc-section-head">
                        <h2>Photos — {formatMonthLabel(group.month)}</h2>
                        <span>{group.count}</span>
                      </div>
                      <div className="doc-photos__grid">
                        {group.items.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            className={`doc-photos__card ${selectedId === photo.id ? "is-selected" : ""}`}
                            onClick={() => setSelectedId(photo.id)}
                          >
                            <div className="doc-photos__thumb">
                              <span>{extensionBadge(photo.file_extension || "JPG")}</span>
                            </div>
                            <p>{formatLibraryDate(photo.captured_at || photo.created_at)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>

        <DocumentPreviewPanel
          itemId={selectedId}
          listItem={selectedItem}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      </div>

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSaved={onUploaded}
        defaultFolder={folder}
        defaultProjectId={projectId}
      />
    </div>
  );
}
