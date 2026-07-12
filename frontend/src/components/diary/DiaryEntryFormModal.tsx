"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { TextInput } from "@/components/ui/TextInput";
import { ApiClientError } from "@/lib/api/client";
import { createDiaryEntry, updateDiaryEntry } from "@/lib/api/diary";
import { uploadLibraryFile } from "@/lib/api/documents";
import type { DiaryEntry, DiaryEntryWriteInput } from "@/lib/api/types";
import {
  EQUIPMENT_PRESETS,
  LABOUR_PRESETS,
  todayISO,
  weatherLabel,
  WEATHER_OPTIONS,
} from "@/lib/diary/labels";
import { clearDiaryDraft, loadDiaryDraft, saveDiaryDraft } from "@/lib/offline/storage";

type Props = {
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSaved: (entry: DiaryEntry) => void;
  initial?: DiaryEntry | null;
};

const empty = {
  entry_date: todayISO(),
  weather_condition: "partly_cloudy",
  weather_temperature_c: "",
  workforce_count: "0",
  working_hours: "8",
  work_description: "",
  progress_percent: "0",
  delays: "",
  safety_concerns: "",
  required_actions: "",
  site_conditions_notes: "",
};

export function DiaryEntryFormModal({
  open,
  projectId,
  projectName,
  onClose,
  onSaved,
  initial,
}: Props) {
  const [form, setForm] = useState(empty);
  const [labour, setLabour] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ url: string; caption?: string }[]>([]);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        entry_date: initial.entry_date,
        weather_condition: initial.weather_condition || "partly_cloudy",
        weather_temperature_c: initial.weather_temperature_c
          ? String(initial.weather_temperature_c)
          : "",
        workforce_count: String(initial.workforce_count ?? 0),
        working_hours: String(initial.working_hours ?? 8),
        work_description: initial.work_description ?? "",
        progress_percent: String(initial.progress_percent ?? 0),
        delays: initial.delays ?? "",
        safety_concerns: initial.safety_concerns ?? "",
        required_actions: initial.required_actions ?? "",
        site_conditions_notes: initial.site_conditions_notes ?? "",
      });
      setLabour(initial.labour_activities ?? []);
      setEquipment(initial.equipment_used ?? []);
      setPhotos(
        (initial.photos || []).map((p) => ({
          url: typeof p === "string" ? p : p.url || "",
          caption: typeof p === "string" ? undefined : p.caption,
        })).filter((p) => p.url),
      );
      setDraftHint(null);
    } else {
      const date = todayISO();
      const draft = loadDiaryDraft(projectId, date);
      if (draft) {
        setForm({
          entry_date: draft.entry_date || date,
          weather_condition: draft.weather_condition || "partly_cloudy",
          weather_temperature_c: draft.weather_temperature_c || "",
          workforce_count: draft.workforce_count || "0",
          working_hours: draft.working_hours || "8",
          work_description: draft.work_description || "",
          progress_percent: draft.progress_percent || "0",
          delays: draft.delays || "",
          safety_concerns: draft.safety_concerns || "",
          required_actions: draft.required_actions || "",
          site_conditions_notes: draft.site_conditions_notes || "",
        });
        setLabour(draft.labour || []);
        setEquipment(draft.equipment || []);
        setPhotos(draft.photos || []);
        setDraftHint("Restored a local draft from this device.");
      } else {
        setForm({ ...empty, entry_date: date });
        setLabour([]);
        setEquipment([]);
        setPhotos([]);
        setDraftHint(null);
      }
    }
    setError(null);
  }, [open, initial, projectId]);

  useEffect(() => {
    if (!open || initial) return;
    const timer = window.setTimeout(() => {
      saveDiaryDraft(projectId, form.entry_date, {
        ...form,
        labour,
        equipment,
        photos,
      });
      setDraftHint("Draft saved on this device.");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [open, initial, projectId, form, labour, equipment, photos]);

  const previewSnippet = useMemo(() => {
    const text = form.work_description.trim();
    if (!text) return "Start writing today’s work description to preview the entry.";
    return text.length > 180 ? `${text.slice(0, 180)}…` : text;
  }, [form.work_description]);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function toggleTag(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function onUploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: { url: string; caption?: string }[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        const result = await uploadLibraryFile(file);
        uploaded.push({ url: result.file_url, caption: result.original_name });
      }
      setPhotos((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: DiaryEntryWriteInput = {
        entry_date: form.entry_date,
        weather_condition: form.weather_condition,
        weather_temperature_c: form.weather_temperature_c
          ? Number(form.weather_temperature_c)
          : null,
        workforce_count: Number(form.workforce_count) || 0,
        working_hours: Number(form.working_hours) || 8,
        work_description: form.work_description.trim(),
        progress_percent: Number(form.progress_percent) || 0,
        labour_activities: labour,
        equipment_used: equipment,
        delays: form.delays.trim(),
        safety_concerns: form.safety_concerns.trim(),
        required_actions: form.required_actions.trim(),
        site_conditions_notes: form.site_conditions_notes.trim(),
        photos,
      };

      const entry = initial
        ? await updateDiaryEntry(initial.id, payload)
        : await createDiaryEntry(projectId, payload);
      clearDiaryDraft(projectId, form.entry_date);
      onSaved(entry);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save diary entry.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="diary-modal" role="dialog" aria-modal="true" aria-labelledby="diary-form-title">
      <button type="button" className="diary-modal__backdrop" aria-label="Close" onClick={onClose} />
      <form className="diary-modal__panel" onSubmit={onSubmit}>
        <div className="diary-modal__head">
          <div>
            <p className="diary-modal__eyebrow">
              {initial ? "Edit draft entry" : "New daily site diary"}
            </p>
            <h2 id="diary-form-title" className="diary-modal__title">
              {projectName}
            </h2>
          </div>
          <button type="button" className="diary-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="diary-modal__layout">
          <div className="diary-modal__body">
            <OfflineBanner />
            {draftHint ? <p className="text-xs font-medium text-[var(--gray-500)]">{draftHint}</p> : null}

            <div className="diary-form-grid">
              <TextInput
                label="Entry date"
                name="entry_date"
                type="date"
                required
                value={form.entry_date}
                onChange={update("entry_date")}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Weather</label>
                <select
                  className="diary-select"
                  value={form.weather_condition}
                  onChange={update("weather_condition")}
                >
                  {WEATHER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="diary-form-grid">
              <TextInput
                label="Temperature (°C)"
                name="weather_temperature_c"
                type="number"
                step="0.1"
                value={form.weather_temperature_c}
                onChange={update("weather_temperature_c")}
              />
              <TextInput
                label="Workforce count"
                name="workforce_count"
                type="number"
                min="0"
                value={form.workforce_count}
                onChange={update("workforce_count")}
              />
              <TextInput
                label="Working hours"
                name="working_hours"
                type="number"
                min="0"
                step="0.5"
                value={form.working_hours}
                onChange={update("working_hours")}
              />
              <TextInput
                label="Progress %"
                name="progress_percent"
                type="number"
                min="0"
                max="100"
                value={form.progress_percent}
                onChange={update("progress_percent")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">
                Work completed today
              </label>
              <textarea
                className="diary-textarea"
                rows={5}
                required
                value={form.work_description}
                onChange={update("work_description")}
                placeholder="Describe activities, progress, and outcomes…"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--navy)]">Labour activities</p>
              <div className="diary-tags">
                {LABOUR_PRESETS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`diary-tag${labour.includes(tag) ? " is-on" : ""}`}
                    onClick={() => toggleTag(labour, tag, setLabour)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--navy)]">Equipment used</p>
              <div className="diary-tags">
                {EQUIPMENT_PRESETS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`diary-tag${equipment.includes(tag) ? " is-on" : ""}`}
                    onClick={() => toggleTag(equipment, tag, setEquipment)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">
                Site photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                disabled={uploading}
                onChange={(e) => void onUploadPhotos(e.target.files)}
              />
              {uploading ? (
                <p className="mt-1 text-xs text-[var(--gray-500)]">Uploading…</p>
              ) : null}
              {photos.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((photo) => (
                    <div key={photo.url} className="relative h-16 w-16 overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.caption || "Site photo"} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white"
                        onClick={() => setPhotos((current) => current.filter((p) => p.url !== photo.url))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Delays</label>
              <textarea
                className="diary-textarea"
                rows={2}
                value={form.delays}
                onChange={update("delays")}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">
                Safety concerns
              </label>
              <textarea
                className="diary-textarea"
                rows={2}
                value={form.safety_concerns}
                onChange={update("safety_concerns")}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">
                Required actions
              </label>
              <textarea
                className="diary-textarea"
                rows={2}
                value={form.required_actions}
                onChange={update("required_actions")}
                placeholder="Optional"
              />
            </div>

            {error ? <p className="diary-form-error">{error}</p> : null}
          </div>

          <aside className="diary-preview">
            <p className="diary-preview__eyebrow">Live preview</p>
            <h3 className="diary-preview__title">{projectName}</h3>
            <p className="diary-preview__meta">
              {form.entry_date} · {weatherLabel(form.weather_condition)}
              {form.weather_temperature_c ? ` · ${form.weather_temperature_c}°C` : ""}
            </p>
            <p className="diary-preview__stats">
              {form.workforce_count || 0} workers · {form.working_hours || 0}h ·{" "}
              {form.progress_percent || 0}% progress
              {photos.length ? ` · ${photos.length} photo${photos.length === 1 ? "" : "s"}` : ""}
            </p>
            <p className="diary-preview__body">{previewSnippet}</p>
            {(labour.length > 0 || equipment.length > 0) && (
              <div className="diary-preview__tags">
                {[...labour, ...equipment].map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
            <ol className="diary-preview__flow">
              <li className="is-on">1. Draft</li>
              <li>2. Submitted</li>
              <li>3. Approved</li>
            </ol>
          </aside>
        </div>

        <div className="diary-modal__actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || uploading}>
            {loading ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}
