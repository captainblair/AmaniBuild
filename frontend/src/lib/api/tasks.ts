import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type {
  MyTasksSummary,
  PaginatedResponse,
  Task,
  TaskBoard,
  TaskComment,
  TaskListItem,
  TaskStatus,
  TaskWriteInput,
} from "@/lib/api/types";

export async function fetchTaskBoard(params?: {
  project_id?: string;
  assignee_id?: string;
  priority?: string;
  search?: string;
}): Promise<TaskBoard> {
  const query = new URLSearchParams();
  if (params?.project_id) query.set("project_id", params.project_id);
  if (params?.assignee_id) query.set("assignee_id", params.assignee_id);
  if (params?.priority) query.set("priority", params.priority);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  const data = await apiDataRequest<{ board: TaskBoard }>(
    `/tasks/board/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.board;
}

export async function fetchProjectTaskBoard(
  projectId: string,
  params?: { assignee_id?: string; priority?: string; search?: string },
): Promise<TaskBoard> {
  const query = new URLSearchParams();
  if (params?.assignee_id) query.set("assignee_id", params.assignee_id);
  if (params?.priority) query.set("priority", params.priority);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  const data = await apiDataRequest<{ board: TaskBoard }>(
    `/projects/${projectId}/tasks/board/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.board;
}

export async function fetchTasks(params?: {
  page?: number;
  page_size?: number;
  project_id?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  search?: string;
}): Promise<PaginatedResponse<TaskListItem>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.project_id) query.set("project_id", params.project_id);
  if (params?.status) query.set("status", params.status);
  if (params?.priority) query.set("priority", params.priority);
  if (params?.assignee_id) query.set("assignee_id", params.assignee_id);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return apiRequest<PaginatedResponse<TaskListItem>>(`/tasks/${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
}

export async function fetchMyTasks(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  open_only?: boolean;
}): Promise<PaginatedResponse<TaskListItem> & { summary: MyTasksSummary }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.status) query.set("status", params.status);
  if (params?.open_only === false) query.set("open_only", "false");
  const qs = query.toString();
  return apiRequest(`/tasks/my/${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function fetchTask(id: string): Promise<Task> {
  const data = await apiDataRequest<{ task: Task }>(`/tasks/${id}/`, { method: "GET" });
  return data.task;
}

export async function createTask(input: TaskWriteInput): Promise<Task> {
  const data = await apiDataRequest<{ task: Task }>("/tasks/", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.task;
}

export async function updateTask(
  id: string,
  input: Partial<TaskWriteInput>,
): Promise<Task> {
  const data = await apiDataRequest<{ task: Task }>(`/tasks/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await apiDataRequest(`/tasks/${id}/`, { method: "DELETE" });
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  board_position?: number,
): Promise<Task> {
  const data = await apiDataRequest<{ task: Task }>(`/tasks/${id}/status/`, {
    method: "POST",
    body: JSON.stringify({ status, board_position }),
  });
  return data.task;
}

export async function fetchTaskComments(id: string): Promise<TaskComment[]> {
  const data = await apiDataRequest<{ comments: TaskComment[] }>(`/tasks/${id}/comments/`, {
    method: "GET",
  });
  return data.comments;
}

export async function addTaskComment(id: string, body: string): Promise<TaskComment> {
  const data = await apiDataRequest<{ comment: TaskComment }>(`/tasks/${id}/comments/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return data.comment;
}
