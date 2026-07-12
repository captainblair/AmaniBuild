"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/TaskBadges";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import {
  addTaskComment,
  deleteTask,
  fetchTask,
  updateTaskStatus,
} from "@/lib/api/tasks";
import type { Task } from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatTaskDate, TASK_STATUSES } from "@/lib/tasks/labels";

type Props = { taskId: string };

export function TaskDetailPage({ taskId }: Props) {
  const router = useRouter();
  const { membership, user } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_tasks");

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTask(await fetchTask(taskId));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load task.");
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canComment =
    canManage || (task?.assignee?.id != null && task.assignee.id === user.id);
  const canMoveStatus =
    canManage || (task?.assignee?.id != null && task.assignee.id === user.id);

  async function onStatusChange(status: string) {
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      setTask(await updateTaskStatus(task.id, status));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update status.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!task) return;
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    setBusy(true);
    try {
      await deleteTask(task.id);
      router.push("/dashboard/tasks");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not delete task.");
      setBusy(false);
    }
  }

  async function onComment(e: FormEvent) {
    e.preventDefault();
    if (!task || !comment.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addTaskComment(task.id, comment.trim());
      setComment("");
      setTask(await fetchTask(task.id));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not add comment.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading task…" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="dash-panel mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-[var(--red)]">{error ?? "Task not found."}</p>
        <Button href="/dashboard/tasks" className="mt-4" variant="outline">
          Back to tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="task-detail space-y-5">
      <div className="task-detail__crumb">
        <Link href="/dashboard/tasks">Tasks</Link>
        <span>/</span>
        <span>{task.title}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            {task.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            {task.project_name}
            {task.site_name ? ` · ${task.site_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onDelete()}>
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {error ? <p className="task-form-error">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="dash-panel p-5 space-y-4">
          <h2 className="dash-panel__title">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--gray-600)]">
            {task.description || "No description provided."}
          </p>

          <div>
            <h2 className="dash-panel__title">Comments</h2>
            {task.comments?.length ? (
              <ul className="task-comments mt-3">
                {task.comments.map((c) => (
                  <li key={c.id}>
                    <p className="font-medium text-[var(--navy)]">
                      {c.author?.full_name || "Team member"}
                    </p>
                    <p className="text-xs text-[var(--gray-500)]">
                      {new Date(c.created_at).toLocaleString("en-KE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--gray-600)]">{c.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--gray-500)]">No comments yet.</p>
            )}
            {canComment ? (
              <form className="mt-4 space-y-2" onSubmit={onComment}>
                <textarea
                  className="task-textarea"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                />
                <Button type="submit" size="sm" disabled={busy || !comment.trim()}>
                  Post comment
                </Button>
              </form>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="dash-panel p-4 space-y-3">
            <h2 className="dash-panel__title">Details</h2>
            <dl className="task-meta">
              <div>
                <dt>Assignee</dt>
                <dd>{task.assignee?.full_name || "Unassigned"}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd className={task.is_overdue ? "text-[var(--red)]" : ""}>
                  {formatTaskDate(task.due_date)}
                  {task.is_due_today ? " (today)" : ""}
                </dd>
              </div>
              <div>
                <dt>Created by</dt>
                <dd>{task.created_by?.full_name || "—"}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>
                  {task.completed_at
                    ? new Date(task.completed_at).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>

          {canMoveStatus ? (
            <section className="dash-panel p-4 space-y-3">
              <h2 className="dash-panel__title">Move status</h2>
              <div className="flex flex-wrap gap-2">
                {TASK_STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant={task.status === s.value ? "primary" : "outline"}
                    disabled={busy || task.status === s.value}
                    onClick={() => void onStatusChange(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <TaskFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setTask(saved);
          void load();
        }}
        initial={task}
      />
    </div>
  );
}
