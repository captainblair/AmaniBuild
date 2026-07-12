"use client";

import { useMemo } from "react";
import type { ScheduleGantt, ScheduleItem } from "@/lib/api/types";
import {
  barGeometry,
  buildMonthHeaders,
  daysBetween,
  parseIsoDate,
  scheduleStatusTone,
} from "@/lib/schedule/labels";

type Props = {
  gantt: ScheduleGantt;
  selectedId: string | null;
  onSelect: (item: ScheduleItem) => void;
};

export function GanttChart({ gantt, selectedId, onSelect }: Props) {
  const { rangeStart, totalDays, months, todayLeft } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = parseIsoDate(
      gantt.timeline_start || gantt.items[0]?.start_date || today.toISOString().slice(0, 10),
    );
    const end = parseIsoDate(
      gantt.timeline_end || gantt.items[0]?.end_date || today.toISOString().slice(0, 10),
    );
    // Pad a few days for readability
    const paddedStart = new Date(start);
    paddedStart.setDate(paddedStart.getDate() - 3);
    const paddedEnd = new Date(end);
    paddedEnd.setDate(paddedEnd.getDate() + 7);
    const total = Math.max(daysBetween(paddedStart, paddedEnd) + 1, 14);
    const monthHeaders = buildMonthHeaders(paddedStart, paddedEnd);
    const todayOffset = daysBetween(paddedStart, today);
    const todayPct =
      todayOffset < 0 || todayOffset > total ? null : (todayOffset / total) * 100;
    return {
      rangeStart: paddedStart,
      totalDays: total,
      months: monthHeaders,
      todayLeft: todayPct,
    };
  }, [gantt]);

  const items = gantt.items;

  if (items.length === 0) {
    return (
      <div className="gantt-empty">
        <p>No schedule items yet. Add a task or milestone to build the timeline.</p>
      </div>
    );
  }

  return (
    <div className="gantt">
      <div className="gantt__head">
        <div className="gantt__label-col">Activity</div>
        <div className="gantt__timeline-head">
          {months.map((m) => (
            <div
              key={m.key}
              className="gantt__month"
              style={{ flex: `${m.days} 0 0` }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      <div className="gantt__body">
        {items.map((item, index) => {
          const geom = barGeometry(item.start_date, item.end_date, rangeStart, totalDays);
          const tone = scheduleStatusTone(item.status);
          const code = `T${String(index + 1).padStart(2, "0")}`;
          return (
            <button
              key={item.id}
              type="button"
              className={`gantt__row${selectedId === item.id ? " is-selected" : ""}`}
              onClick={() => onSelect(item)}
            >
              <div className="gantt__label-col">
                <span className="gantt__code">{code}</span>
                <div className="min-w-0">
                  <p className="gantt__title">
                    {item.is_milestone ? "◆ " : ""}
                    {item.title}
                  </p>
                  <p className="gantt__meta">
                    {item.assignee_name || "Unassigned"}
                    {item.phase_name ? ` · ${item.phase_name}` : ""}
                  </p>
                </div>
                <span className={`gantt-pill gantt-pill--${tone}`}>
                  {Math.round(item.progress_percent)}%
                </span>
              </div>
              <div className="gantt__track">
                {todayLeft != null ? (
                  <span className="gantt__today" style={{ left: `${todayLeft}%` }} aria-hidden />
                ) : null}
                {item.is_milestone ? (
                  <span
                    className="gantt__milestone"
                    style={{ left: `${geom.left}%`, background: item.color || "#eab308" }}
                    title={item.title}
                  />
                ) : (
                  <span
                    className={`gantt__bar gantt__bar--${tone}`}
                    style={{
                      left: `${geom.left}%`,
                      width: `${geom.width}%`,
                      background: item.color || undefined,
                    }}
                    title={`${item.title} (${item.duration_days}d)`}
                  >
                    <span
                      className="gantt__bar-fill"
                      style={{ width: `${Math.min(100, item.progress_percent)}%` }}
                    />
                    <span className="gantt__bar-label">{item.title}</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
