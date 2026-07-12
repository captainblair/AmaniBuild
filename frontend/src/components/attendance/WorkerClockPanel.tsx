"use client";

import { useCallback, useEffect, useState } from "react";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { Button } from "@/components/ui/Button";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ApiClientError } from "@/lib/api/client";
import {
  clockAttendance,
  fetchMyAttendanceToday,
  qrScanCheckIn,
} from "@/lib/api/attendance";
import type { WorkerTodayActivity } from "@/lib/api/types";
import { formatAttendanceTime } from "@/lib/attendance/labels";
import {
  enqueueClockAction,
  loadClockQueue,
  saveClockQueue,
  type QueuedClockAction,
} from "@/lib/offline/storage";

type Props = {
  projectId: string;
  projectName?: string;
};

async function readGeo(): Promise<{ latitude?: number; longitude?: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export function WorkerClockPanel({ projectId, projectName }: Props) {
  const [activity, setActivity] = useState<WorkerTodayActivity | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [notAssigned, setNotAssigned] = useState(false);
  const [queued, setQueued] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotAssigned(false);
    try {
      const data = await fetchMyAttendanceToday(projectId);
      setActivity(data);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "not_assigned") {
        setNotAssigned(true);
        setActivity(null);
      } else {
        setError(err instanceof ApiClientError ? err.message : "Could not load your attendance.");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = loadClockQueue().filter((q) => q.project_id === projectId);
    if (queue.length === 0) {
      setQueued(loadClockQueue().length);
      return;
    }
    const remaining: QueuedClockAction[] = loadClockQueue().filter((q) => q.project_id !== projectId);
    for (const item of queue) {
      try {
        await clockAttendance({
          project_id: item.project_id,
          event_type: item.event_type,
          check_in_point_code: item.check_in_point_code,
          latitude: item.latitude,
          longitude: item.longitude,
        });
      } catch {
        remaining.push(item);
      }
    }
    saveClockQueue(remaining);
    setQueued(remaining.length);
    await load();
  }, [projectId, load]);

  useEffect(() => {
    void load();
    setQueued(loadClockQueue().length);
  }, [load]);

  useEffect(() => {
    function onOnline() {
      void flushQueue();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushQueue]);

  async function runClock(eventType: "check_in" | "check_out" | "break_start" | "break_end") {
    setBusy(true);
    setError(null);
    setWarning(null);
    const geo = await readGeo();
    const payload = {
      project_id: projectId,
      event_type: eventType,
      check_in_point_code: code.trim() || undefined,
      ...geo,
    };

    if (!navigator.onLine) {
      enqueueClockAction(payload);
      setQueued(loadClockQueue().length);
      setWarning("You’re offline — clock action queued on this device.");
      setBusy(false);
      return;
    }

    try {
      const result = await clockAttendance(payload);
      setActivity(result.activity);
      if (result.warning?.message) setWarning(result.warning.message);
    } catch (err) {
      enqueueClockAction(payload);
      setQueued(loadClockQueue().length);
      setError(
        err instanceof ApiClientError
          ? `${err.message} (queued to retry)`
          : "Clock action failed and was queued.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runQrScan() {
    if (!code.trim()) {
      setError("Enter a check-in point code to scan.");
      return;
    }
    setBusy(true);
    setError(null);
    setWarning(null);
    const geo = await readGeo();
    try {
      const result = await qrScanCheckIn({
        project_id: projectId,
        check_in_point_code: code.trim(),
        ...geo,
      });
      setActivity(result.activity);
      if (result.warning?.message) setWarning(result.warning.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "QR check-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="dash-panel p-5">
        <p className="text-sm text-[var(--gray-500)]">Loading your clock status…</p>
      </section>
    );
  }

  if (notAssigned) {
    return (
      <section className="dash-panel p-5">
        <h2 className="dash-panel__title">My clock</h2>
        <p className="mt-2 text-sm text-[var(--gray-500)]">
          You are not assigned to {projectName || "this project"} yet. Ask a foreman or PM to add you.
        </p>
      </section>
    );
  }

  return (
    <section className="dash-panel p-5 space-y-4">
      <OfflineBanner />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="dash-panel__title">My clock</h2>
          <p className="mt-1 text-sm text-[var(--gray-500)]">
            {activity?.project_name || projectName} · shift {activity?.shift_start?.slice(0, 5)}–
            {activity?.shift_end?.slice(0, 5)}
          </p>
        </div>
        {activity ? <AttendanceStatusBadge status={activity.status} /> : null}
      </div>

      {error ? <p className="att-form-error">{error}</p> : null}
      {warning ? <p className="att-form-warn">{warning}</p> : null}
      {queued > 0 ? (
        <p className="att-form-warn">
          {queued} queued clock action{queued === 1 ? "" : "s"} waiting to sync.
          {navigator.onLine ? (
            <>
              {" "}
              <button type="button" className="underline" onClick={() => void flushQueue()}>
                Retry now
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="att-stat">
          <p className="att-stat__label">On site</p>
          <p className="att-stat__value">{activity?.on_site_now ? "Yes" : "No"}</p>
        </div>
        <div className="att-stat">
          <p className="att-stat__label">Hours today</p>
          <p className="att-stat__value">{activity?.total_hours ?? 0}h</p>
        </div>
        <div className="att-stat">
          <p className="att-stat__label">Overtime</p>
          <p className="att-stat__value">{activity?.overtime_hours ?? 0}h</p>
        </div>
      </div>

      <label className="att-field">
        <span>Check-in point code (optional for clock / required for QR)</span>
        <input
          className="att-select"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste gate code"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11 min-w-[7.5rem]"
          disabled={busy || activity?.on_site_now}
          onClick={() => void runClock("check_in")}
        >
          Check in
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-[7.5rem]"
          disabled={busy || !activity?.on_site_now}
          onClick={() => void runClock("check_out")}
        >
          Check out
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy || !activity?.on_site_now}
          onClick={() => void runClock("break_start")}
        >
          Break start
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy || !activity?.on_site_now}
          onClick={() => void runClock("break_end")}
        >
          Break end
        </Button>
        <Button
          type="button"
          variant="navy"
          className="min-h-11"
          disabled={busy}
          onClick={() => void runQrScan()}
        >
          QR check-in
        </Button>
      </div>

      {activity?.events?.length ? (
        <ul className="att-event-list">
          {activity.events.map((ev) => (
            <li key={ev.id}>
              <span className="font-medium capitalize">{ev.event_type.replace(/_/g, " ")}</span>
              <span className="text-[var(--gray-500)]">
                {formatAttendanceTime(ev.event_at)}
                {ev.location ? ` · ${ev.location}` : ""}
                {ev.is_late ? " · late" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--gray-500)]">No clock events yet today.</p>
      )}
    </section>
  );
}
