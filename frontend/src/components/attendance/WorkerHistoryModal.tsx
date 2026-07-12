"use client";

import { useEffect, useState } from "react";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchWorkerHistory } from "@/lib/api/attendance";
import type { WorkerAttendanceHistory } from "@/lib/api/types";
import { daysAgoIso, formatAttendanceTime, todayIso } from "@/lib/attendance/labels";

type Props = {
  projectId: string;
  workerId: string;
  workerName: string;
  onClose: () => void;
};

export function WorkerHistoryModal({ projectId, workerId, workerName, onClose }: Props) {
  const [history, setHistory] = useState<WorkerAttendanceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchWorkerHistory(projectId, workerId, {
      date_from: daysAgoIso(13),
      date_to: todayIso(),
    })
      .then(setHistory)
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : "Could not load history."),
      )
      .finally(() => setLoading(false));
  }, [projectId, workerId]);

  return (
    <div className="att-modal">
      <button type="button" className="att-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="att-modal__panel att-modal__panel--wide" role="dialog" aria-modal="true">
        <div className="att-modal__head">
          <div>
            <p className="att-modal__eyebrow">Worker history</p>
            <h2 className="att-modal__title">{workerName}</h2>
          </div>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="att-modal__body">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner label="Loading history…" />
            </div>
          ) : null}
          {error ? <p className="att-form-error">{error}</p> : null}
          {history ? (
            <ul className="att-history">
              {[...history.calendar].reverse().map((day) => (
                <li key={day.date} className="att-history__day">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--navy)]">
                      {new Date(day.date + "T12:00:00").toLocaleDateString("en-KE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <AttendanceStatusBadge status={day.status} />
                  </div>
                  {day.events.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-[var(--gray-600)]">
                      {day.events.map((ev) => (
                        <li key={ev.id}>
                          {ev.event_type.replace(/_/g, " ")} · {formatAttendanceTime(ev.event_at)}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--gray-500)]">No events</p>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="att-modal__actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
