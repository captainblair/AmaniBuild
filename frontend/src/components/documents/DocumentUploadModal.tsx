"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createLibraryItem, uploadLibraryFile } from "@/lib/api/documents";
import { fetchProjects } from "@/lib/api/projects";
import type { LibraryItem, ProjectListItem } from "@/lib/api/types";
import { ASSET_TYPES, DOCUMENT_TYPES } from "@/lib/documents/labels";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (item: LibraryItem) => void;
  defaultFolder?: string;
  defaultProjectId?: string;
};

export function DocumentUploadModal({
  open,
  onClose,
  onSaved,
  defaultFolder = "",
  defaultProjectId = "",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState("document");
  const [documentType, setDocumentType] = useState("other");
  const [folderPath, setFolderPath] = useState(defaultFolder);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => setProjects(data.results))
      .catch(() => setProjects([]));

    setTitle("");
    setDescription("");
    setAssetType(defaultFolder.toLowerCase().startsWith("photos") ? "photo" : "document");
    setDocumentType("other");
    setFolderPath(defaultFolder);
    setProjectId(defaultProjectId);
    setFile(null);
    setError(null);
    setBusy(false);
  }, [open, defaultFolder, defaultProjectId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    const resolvedTitle = (title.trim() || file.name || "Untitled").trim();
    if (!resolvedTitle) {
      setError("Title is required.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadLibraryFile(file);
      const item = await createLibraryItem({
        title: resolvedTitle,
        description: description.trim(),
        asset_type: assetType,
        document_type: documentType,
        folder_path: folderPath.trim(),
        project_id: projectId || null,
        file_url: uploaded.file_url,
        file_extension: uploaded.file_extension,
        mime_type: uploaded.mime_type,
        size_bytes: uploaded.size_bytes,
        captured_at: assetType === "photo" ? new Date().toISOString() : null,
      });
      onSaved(item);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="doc-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="doc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Upload document"
        onSubmit={onSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="doc-modal__head">
          <h2>Upload document</h2>
          <button
            type="button"
            className="doc-modal__close"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <div className="doc-modal__body">
          {error ? <p className="doc-error">{error}</p> : null}

          <label className="doc-field">
            <span>File</span>
            <input
              type="file"
              className="doc-file"
              required
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                setFile(next);
                if (next && !title.trim()) setTitle(next.name);
                if (next?.type.startsWith("image/")) setAssetType("photo");
              }}
            />
            {file ? (
              <span className="doc-field__hint">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </span>
            ) : (
              <span className="doc-field__hint">PDF, images, drawings — up to 50MB</span>
            )}
          </label>

          <label className="doc-field">
            <span>Title</span>
            <input
              className="doc-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="structural_drawing_block_b.dwg"
            />
          </label>

          <div className="doc-form-grid">
            <label className="doc-field">
              <span>Asset type</span>
              <select className="doc-select" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="doc-field">
              <span>Document type</span>
              <select
                className="doc-select"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="doc-field">
            <span>Folder path</span>
            <input
              className="doc-input"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Drawings/Structural"
            />
          </label>

          <label className="doc-field">
            <span>Project</span>
            <select className="doc-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Company library</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="doc-field">
            <span>Description</span>
            <textarea
              className="doc-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
            />
          </label>
        </div>

        <div className="doc-modal__foot">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
