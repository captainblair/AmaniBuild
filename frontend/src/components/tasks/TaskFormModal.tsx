"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/client";
import { createTask, updateTask } from "@/lib/api/tasks";
import { fetchProjects } from "@/lib/api/projects";
import { fetchCompanyMembers } from "@/lib/api/team";
import type { CompanyMember, ProjectListItem, Task, TaskWriteInput } from "@/lib/api/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/labels";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (task: Task) => void;
  initial?: Task | null;
  defaultProjectId?: string;
};

export function TaskFormModal({
  open,
  onClose,
  onSaved,
  initial,
  defaultProjectId = "",
}: Props) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => setProjects(data.results))
      .catch(() => setProjects([]));
    void fetchCompanyMembers()
      .then((list) => setMembers(list.filter((m) => m.is_active)))
      .catch(() => setMembers([]));

    if (initial) {
      setProjectId(initial.project);
      setTitle(initial.title);
      setDescription(initial.description || "");
      setStatus(initial.status || "todo");
      setPriority(initial.priority || "medium");
      setDueDate(initial.due_date || "");
      setAssigneeId(initial.assignee?.id || "");
    } else {
      setProjectId(defaultProjectId);
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      setAssigneeId("");
    }
    setError(null);
  }, [open, initial, defaultProjectId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) {
      setError("Project and title are required.");
      return;
    }
    const payload: TaskWriteInput = {
      project_id: projectId,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate || null,
      assignee_id: assigneeId || null,
    };
    setBusy(true);
    setError(null);
    try {
      const saved = initial
        ? await updateTask(initial.id, payload)
        : await createTask(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save task.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="task-modal">
      <button type="button" className="task-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="task-modal__panel" role="dialog" aria-modal="true">
        <div className="task-modal__head">
          <div>
            <p className="task-modal__eyebrow">Tasks</p>
            <h2 className="task-modal__title">{initial ? "Edit task" : "New task"}</h2>
          </div>
          <button type="button" className="task-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="task-modal__body">
            {error ? <p className="task-form-error">{error}</p> : null}
            <label className="task-field">
              <span>Title</span>
              <input
                className="task-select"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pour slab for block B"
                required
              />
            </label>
            <label className="task-field">
              <span>Project</span>
              <select
                className="task-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                disabled={Boolean(initial)}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="task-form-grid">
              <label className="task-field">
                <span>Status</span>
                <select className="task-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="task-field">
                <span>Priority</span>
                <select
                  className="task-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="task-form-grid">
              <label className="task-field">
                <span>Due date</span>
                <input
                  type="date"
                  className="task-select"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
              <label className="task-field">
                <span>Assignee</span>
                <select
                  className="task-select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="task-field">
              <span>Description</span>
              <textarea
                className="task-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
          <div className="task-modal__actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : initial ? "Save changes" : "Create task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
