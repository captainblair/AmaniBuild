"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  createLibraryVersion,
  fetchLibraryItem,
  updateLibraryItem,
  uploadLibraryFile,
} from "@/lib/api/documents";
import type { LibraryItem, LibraryItemListItem } from "@/lib/api/types";
import {
  documentTypeLabel,
  extensionBadge,
  formatFileSize,
  formatLibraryDate,
} from "@/lib/documents/labels";

type Props = {
  itemId: string | null;
  listItem?: LibraryItemListItem | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function DocumentPreviewPanel({ itemId, listItem, canManage, onClose, onChanged }: Props) {
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchLibraryItem(itemId)
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Could not load document.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (!itemId) return null;

  const title = item?.title ?? listItem?.title ?? "Document";
  const ext = item?.file_extension ?? listItem?.file_extension ?? "";
  const fileUrl = item?.file_url ?? "";
  const isImage =
    (item?.mime_type || "").startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp"].includes(ext.toLowerCase());
  const isPdf = (item?.mime_type || "") === "application/pdf" || ext.toLowerCase() === "pdf";

  async function onNewVersion(file: File) {
    if (!itemId) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadLibraryFile(file);
      const next = await createLibraryVersion(itemId, {
        file_url: uploaded.file_url,
        file_extension: uploaded.file_extension,
        mime_type: uploaded.mime_type,
        size_bytes: uploaded.size_bytes,
      });
      setItem(next);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create version.");
    } finally {
      setBusy(false);
    }
  }

  async function onArchive() {
    if (!itemId || !item) return;
    setBusy(true);
    try {
      const next = await updateLibraryItem(itemId, { is_archived: !item.is_archived });
      setItem(next);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="doc-preview">
      <div className="doc-preview__head">
        <div className="min-w-0">
          <p className="doc-preview__eyebrow">{documentTypeLabel(item?.document_type ?? listItem?.document_type ?? "")}</p>
          <h2 className="doc-preview__title">{title}</h2>
        </div>
        <button type="button" className="doc-modal__close" onClick={onClose} aria-label="Close preview">
          ×
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner label="Loading…" />
        </div>
      ) : (
        <>
          {error ? <p className="doc-error mx-4">{error}</p> : null}

          <div className="doc-preview__canvas">
            {fileUrl && isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt={title} className="doc-preview__image" />
            ) : fileUrl && isPdf ? (
              <iframe src={fileUrl} title={title} className="doc-preview__frame" />
            ) : (
              <div className="doc-preview__empty">
                <span className="doc-ext">{extensionBadge(ext)}</span>
                <p>{fileUrl ? "Preview not available for this file type." : "No file attached yet."}</p>
              </div>
            )}
          </div>

          <div className="doc-preview__meta">
            <div>
              <span>Version</span>
              <strong>v{item?.version_number ?? listItem?.version?.replace(/^v/i, "") ?? 1}</strong>
            </div>
            <div>
              <span>Size</span>
              <strong>{formatFileSize(item?.size_bytes ?? listItem?.size_bytes ?? 0)}</strong>
            </div>
            <div>
              <span>Uploaded</span>
              <strong>{formatLibraryDate(item?.created_at ?? listItem?.created_at)}</strong>
            </div>
          </div>

          <div className="doc-preview__actions">
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--gray-200)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--navy)] hover:bg-[var(--gray-50)]"
              >
                Download
              </a>
            ) : null}
            {canManage ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (next) void onNewVersion(next);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="!py-2"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  New version
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void onArchive()}>
                  {item?.is_archived ? "Unarchive" : "Archive"}
                </Button>
              </>
            ) : null}
          </div>

          <div className="doc-preview__versions">
            <h3>Version history</h3>
            <ul>
              {(item?.versions ?? []).map((version) => (
                <li key={version.id} className={version.is_current_version ? "is-current" : undefined}>
                  <div>
                    <strong>{version.version}</strong>
                    <span>{formatLibraryDate(version.created_at)}</span>
                  </div>
                  <p>{version.uploaded_by?.full_name ?? "Unknown"}</p>
                </li>
              ))}
              {!item?.versions?.length ? <li className="doc-preview__empty-row">No versions yet.</li> : null}
            </ul>
          </div>
        </>
      )}
    </aside>
  );
}
