"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createCheckInPoint, fetchCheckInPoints } from "@/lib/api/attendance";
import type { CheckInPoint } from "@/lib/api/types";

type Props = {
  siteId: string | null;
  canManage: boolean;
};

export function CheckInPointsPanel({ siteId, canManage }: Props) {
  const [points, setPoints] = useState<CheckInPoint[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) {
      setPoints([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPoints(await fetchCheckInPoints(siteId));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load check-in points.");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!siteId || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCheckInPoint(siteId, { name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create point.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  if (!siteId) {
    return (
      <section className="dash-panel p-4">
        <h2 className="dash-panel__title">QR check-in points</h2>
        <p className="mt-2 text-sm text-[var(--gray-500)]">
          Link a site to this project to create gate check-in codes.
        </p>
      </section>
    );
  }

  return (
    <section className="dash-panel p-4 space-y-3">
      <h2 className="dash-panel__title">QR check-in points</h2>
      <p className="text-sm text-[var(--gray-500)]">
        Workers enter or scan these codes at the gate. Share the code for each point.
      </p>
      {error ? <p className="att-form-error">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--gray-500)]">Loading…</p> : null}
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p.id} className="att-point">
            <div className="min-w-0">
              <p className="font-medium text-[var(--navy)]">{p.name}</p>
              <p className="truncate font-mono text-xs text-[var(--gray-500)]">{p.code}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyCode(p.code)}>
              {copied === p.code ? "Copied" : "Copy"}
            </Button>
          </li>
        ))}
        {!loading && points.length === 0 ? (
          <li className="text-sm text-[var(--gray-500)]">No check-in points yet.</li>
        ) : null}
      </ul>
      {canManage ? (
        <form className="flex flex-wrap gap-2" onSubmit={onCreate}>
          <input
            className="att-select flex-1 min-w-[140px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main gate"
          />
          <Button type="submit" size="sm" disabled={busy || !name.trim()}>
            {busy ? "Adding…" : "+ Add point"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
