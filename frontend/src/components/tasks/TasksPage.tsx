"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/TaskBadges";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiClientError } from "@/lib/api/client";
import { fetchProjects } from "@/lib/api/projects";
import { fetchMyTasks, fetchTaskBoard, updateTaskStatus } from "@/lib/api/tasks";
import { fetchCompanyMembers } from "@/lib/api/team";
import type {
  CompanyMember,
  MyTasksSummary,
  ProjectListItem,
  Task,
  TaskBoard,
  TaskBoardCard,
  TaskListItem,
} from "@/lib/api/types";
import { useDashboardSession } from "@/lib/auth/session";
import { formatTaskDate, TASK_PRIORITIES } from "@/lib/tasks/labels";

const emptyBoard: TaskBoard = {
  columns: [
    { status: "todo", label: "To Do", count: 0, tasks: [] },
    { status: "in_progress", label: "In Progress", count: 0, tasks: [] },
    { status: "done", label: "Done", count: 0, tasks: [] },
  ],
  totals: { all: 0, todo: 0, in_progress: 0, done: 0 },
};

const emptySummary: MyTasksSummary = {
  open_count: 0,
  due_today: 0,
  overdue: 0,
  high_priority: 0,
};

export function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership, user } = useDashboardSession();
  const canManage = membership.permissions.includes("manage_tasks");

  const [view, setView] = useState<"board" | "list" | "mine">("board");
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [board, setBoard] = useState<TaskBoard>(emptyBoard);
  const [myTasks, setMyTasks] = useState<TaskListItem[]>([]);
  const [summary, setSummary] = useState<MyTasksSummary>(emptySummary);
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjects({ page_size: 100, ordering: "name" })
      .then((data) => {
        setProjects(data.results);
        const fromQuery = searchParams.get("project");
        if (fromQuery && data.results.some((p) => p.id === fromQuery)) setProjectId(fromQuery);
      })
      .catch(() => setProjects([]));
    void fetchCompanyMembers()
      .then((list) => setMembers(list.filter((m) => m.is_active)))
      .catch(() => setMembers([]));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage) {
      setFormOpen(true);
      router.replace(projectId ? `/dashboard/tasks?project=${projectId}` : "/dashboard/tasks");
    }
  }, [searchParams, canManage, projectId, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "mine") {
        const data = await fetchMyTasks({ page_size: 50, open_only: true });
        setMyTasks(data.results);
        setSummary(data.summary ?? emptySummary);
      } else {
        const data = await fetchTaskBoard({
          project_id: projectId || undefined,
          assignee_id: assigneeId || undefined,
          priority: priority || undefined,
          search: search.trim() || undefined,
        });
        setBoard(data);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, [view, projectId, assigneeId, priority, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveTask(task: TaskBoardCard, status: string) {
    if (task.status === status) return;
    setMovingId(task.id);
    try {
      await updateTaskStatus(task.id, status);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update status.");
    } finally {
      setMovingId(null);
    }
  }

  function onSaved(task: Task) {
    router.push(`/dashboard/tasks/${task.id}`);
  }

  const totals = board.totals;

  return (
    <div className="task-page space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--gray-500)]">Tasks</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--navy)]">
            Task board
          </h1>
          <p className="mt-1 text-sm text-[var(--gray-600)]">
            Assign work, track progress, and keep crews aligned across sites.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            + New task
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {view === "mine" ? (
          <>
            <KpiCard label="Open" value={summary.open_count} />
            <KpiCard label="Due today" value={summary.due_today} tone={summary.due_today ? "warn" : "default"} />
            <KpiCard label="Overdue" value={summary.overdue} tone={summary.overdue ? "danger" : "default"} />
            <KpiCard label="High priority" value={summary.high_priority} />
          </>
        ) : (
          <>
            <KpiCard label="All tasks" value={totals.all} />
            <KpiCard label="To do" value={totals.todo} />
            <KpiCard label="In progress" value={totals.in_progress} tone="warn" />
            <KpiCard label="Done" value={totals.done} tone="success" />
          </>
        )}
      </div>

      <div className="task-toolbar dash-panel">
        <div className="task-view-toggle">
          <button type="button" className={view === "board" ? "is-active" : ""} onClick={() => setView("board")}>
            Board
          </button>
          <button type="button" className={view === "mine" ? "is-active" : ""} onClick={() => setView("mine")}>
            My tasks
          </button>
        </div>
        {view !== "mine" ? (
          <>
            <input
              className="task-toolbar__search"
              placeholder="Search tasks…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <select className="task-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select className="task-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">All assignees</option>
              <option value={user.id}>Assigned to me</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_name}
                </option>
              ))}
            </select>
            <select className="task-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Loading tasks…" />
        </div>
      ) : null}
      {error ? <p className="task-form-error">{error}</p> : null}

      {!loading && view === "board" && totals.all > 0 ? (
        <div className="task-board">
          {board.columns.map((column) => (
            <section key={column.status} className="task-column">
              <header className="task-column__head">
                <h2>{column.label}</h2>
                <span>{column.count}</span>
              </header>
              <div className="task-column__body">
                {column.tasks.length === 0 ? (
                  <p className="task-column__empty">No tasks</p>
                ) : (
                  column.tasks.map((task) => (
                    <article key={task.id} className="task-card">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/dashboard/tasks/${task.id}`} className="task-card__title">
                          {task.title}
                        </Link>
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                      <p className="task-card__meta">{task.project_name}</p>
                      <div className="task-card__foot">
                        <span className={task.is_overdue ? "text-[var(--red)]" : ""}>
                          {task.due_date ? formatTaskDate(task.due_date) : "No due date"}
                          {task.is_due_today ? " · today" : ""}
                        </span>
                        <span>{task.assignee_name || "Unassigned"}</span>
                      </div>
                      <div className="task-card__moves">
                        {column.status !== "todo" ? (
                          <button
                            type="button"
                            disabled={movingId === task.id}
                            onClick={() => void moveTask(task, "todo")}
                          >
                            To do
                          </button>
                        ) : null}
                        {column.status !== "in_progress" ? (
                          <button
                            type="button"
                            disabled={movingId === task.id}
                            onClick={() => void moveTask(task, "in_progress")}
                          >
                            In progress
                          </button>
                        ) : null}
                        {column.status !== "done" ? (
                          <button
                            type="button"
                            disabled={movingId === task.id}
                            onClick={() => void moveTask(task, "done")}
                          >
                            Done
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {!loading && view === "mine" ? (
        myTasks.length === 0 ? (
          <div className="dash-empty">
            <p className="dash-empty__title">No open tasks assigned to you</p>
            <p className="dash-empty__text">When someone assigns you work, it will show up here.</p>
          </div>
        ) : (
          <div className="dash-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Priority</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <Link href={`/dashboard/tasks/${task.id}`} className="task-table__link">
                          {task.title}
                        </Link>
                      </td>
                      <td className="text-sm text-[var(--gray-600)]">{task.project_name}</td>
                      <td>
                        <TaskPriorityBadge priority={task.priority} />
                      </td>
                      <td className={`text-sm ${task.is_overdue ? "text-[var(--red)]" : "text-[var(--gray-600)]"}`}>
                        {formatTaskDate(task.due_date)}
                      </td>
                      <td>
                        <TaskStatusBadge status={task.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {!loading && view === "board" && totals.all === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty__title">No tasks yet</p>
          <p className="dash-empty__text">Create a task, assign it to a team member, and move it across the board.</p>
          {canManage ? (
            <button type="button" className="dash-empty__link" onClick={() => setFormOpen(true)}>
              Create task
            </button>
          ) : null}
        </div>
      ) : null}

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        defaultProjectId={projectId}
      />
    </div>
  );
}
