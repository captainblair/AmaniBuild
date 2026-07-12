"use client";

import { useCallback, useEffect, useState } from "react";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import {
  clockAttendance,
  fetchMyAttendanceToday,
  qrScanCheckIn,
} from "@/lib/api/attendance";
import type { WorkerTodayActivity } from "@/lib/api/types";
import { formatAttendanceTime } from "@/lib/attendance/labels";

type Props = {
  projectId: string;
  projectName?: string;
};

export function WorkerClockPanel({ projectId, projectName }: Props) {
  const [activity, setActivity] = useState<WorkerTodayActivity | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [notAssigned, setNotAssigned] = useState(false);

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

  useEffect(() => {
    void load();
  }, [load]);

  async function runClock(eventType: "check_in" | "check_out" | "break_start" | "break_end") {
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const result = await clockAttendance({
        project_id: projectId,
        event_type: eventType,
        check_in_point_code: code.trim() || undefined,
      });
      setActivity(result.activity);
      if (result.warning?.message) setWarning(result.warning.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Clock action failed.");
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
    try {
      const result = await qrScanCheckIn({
        project_id: projectId,
        check_in_point_code: code.trim(),
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
        <Button type="button" disabled={busy || activity?.on_site_now} onClick={() => void runClock("check_in")}>
          Check in
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !activity?.on_site_now}
          onClick={() => void runClock("check_out")}
        >
          Check out
        </Button>
        <Button type="button" variant="navy" disabled={busy} onClick={() => void runQrScan()}>
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
