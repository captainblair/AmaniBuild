import { apiDataRequest } from "@/lib/api/client";
import type {
  ScheduleDashboard,
  ScheduleDependency,
  ScheduleGantt,
  ScheduleItem,
  ScheduleItemWriteInput,
  SchedulePhase,
} from "@/lib/api/types";

export async function fetchScheduleGantt(projectId: string): Promise<ScheduleGantt> {
  const data = await apiDataRequest<{ gantt: ScheduleGantt }>(
    `/projects/${projectId}/schedule/gantt/`,
    { method: "GET" },
  );
  return data.gantt;
}

export async function fetchScheduleDashboard(projectId: string): Promise<ScheduleDashboard> {
  const data = await apiDataRequest<{ dashboard: ScheduleDashboard }>(
    `/projects/${projectId}/schedule/dashboard/`,
    { method: "GET" },
  );
  return data.dashboard;
}

export async function fetchSchedulePhases(projectId: string): Promise<SchedulePhase[]> {
  const data = await apiDataRequest<{ phases: SchedulePhase[] }>(
    `/projects/${projectId}/schedule/phases/`,
    { method: "GET" },
  );
  return data.phases;
}

export async function createSchedulePhase(
  projectId: string,
  input: { name: string; color?: string; sort_order?: number },
): Promise<SchedulePhase> {
  const data = await apiDataRequest<{ phase: SchedulePhase }>(
    `/projects/${projectId}/schedule/phases/`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.phase;
}

export async function createScheduleItem(
  projectId: string,
  input: ScheduleItemWriteInput,
): Promise<ScheduleItem> {
  const data = await apiDataRequest<{ item: ScheduleItem }>(
    `/projects/${projectId}/schedule/items/`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.item;
}

export async function fetchScheduleItem(itemId: string): Promise<ScheduleItem> {
  const data = await apiDataRequest<{ item: ScheduleItem }>(`/schedule/items/${itemId}/`, {
    method: "GET",
  });
  return data.item;
}

export async function updateScheduleItem(
  itemId: string,
  input: Partial<ScheduleItemWriteInput>,
): Promise<ScheduleItem> {
  const data = await apiDataRequest<{ item: ScheduleItem }>(`/schedule/items/${itemId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function deleteScheduleItem(itemId: string): Promise<void> {
  await apiDataRequest<{ deleted: boolean }>(`/schedule/items/${itemId}/`, { method: "DELETE" });
}

export async function createScheduleDependency(
  projectId: string,
  input: {
    predecessor_id: string;
    successor_id: string;
    dependency_type?: string;
    lag_days?: number;
  },
): Promise<ScheduleDependency> {
  const data = await apiDataRequest<{ dependency: ScheduleDependency }>(
    `/projects/${projectId}/schedule/dependencies/`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.dependency;
}

export async function deleteScheduleDependency(dependencyId: number): Promise<void> {
  await apiDataRequest<{ deleted: boolean }>(`/schedule/dependencies/${dependencyId}/`, {
    method: "DELETE",
  });
}

export async function syncScheduleItemFromTask(itemId: string): Promise<ScheduleItem> {
  const data = await apiDataRequest<{ item: ScheduleItem }>(
    `/schedule/items/${itemId}/sync-task/`,
    { method: "POST", body: "{}" },
  );
  return data.item;
}
