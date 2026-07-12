import { apiDataRequest } from "@/lib/api/client";
import type {
  AttendanceAnalytics,
  AttendanceDashboard,
  CheckInPoint,
  WorkerAssignment,
  WorkerAttendanceHistory,
  WorkerTodayActivity,
} from "@/lib/api/types";

export async function fetchAttendanceDashboard(
  projectId: string,
  date?: string,
): Promise<AttendanceDashboard> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await apiDataRequest<{ dashboard: AttendanceDashboard }>(
    `/projects/${projectId}/attendance/dashboard/${query}`,
    { method: "GET" },
  );
  return data.dashboard;
}

export async function fetchAttendanceAnalytics(
  projectId: string,
  params?: { date_from?: string; date_to?: string },
): Promise<AttendanceAnalytics> {
  const query = new URLSearchParams();
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const qs = query.toString();
  const data = await apiDataRequest<{ analytics: AttendanceAnalytics }>(
    `/projects/${projectId}/attendance/analytics/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.analytics;
}

export async function fetchWorkerAssignments(projectId: string): Promise<WorkerAssignment[]> {
  const data = await apiDataRequest<{ assignments: WorkerAssignment[] }>(
    `/projects/${projectId}/attendance/assignments/`,
    { method: "GET" },
  );
  return data.assignments;
}

export async function assignWorker(
  projectId: string,
  input: {
    worker_id: string;
    trade?: string;
    employee_code?: string;
    shift_start_time?: string;
    shift_end_time?: string;
  },
): Promise<WorkerAssignment> {
  const data = await apiDataRequest<{ assignment: WorkerAssignment }>(
    `/projects/${projectId}/attendance/assignments/`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.assignment;
}

export async function markAttendance(
  projectId: string,
  input: {
    worker_id: string;
    work_date: string;
    status: "present" | "absent" | "late";
    notes?: string;
  },
): Promise<unknown> {
  return apiDataRequest(`/projects/${projectId}/attendance/mark/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchWorkerHistory(
  projectId: string,
  workerId: string,
  params?: { date_from?: string; date_to?: string },
): Promise<WorkerAttendanceHistory> {
  const query = new URLSearchParams();
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const qs = query.toString();
  const data = await apiDataRequest<{ history: WorkerAttendanceHistory }>(
    `/projects/${projectId}/attendance/workers/${workerId}/history/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.history;
}

export async function fetchCheckInPoints(siteId: string): Promise<CheckInPoint[]> {
  const data = await apiDataRequest<{ check_in_points: CheckInPoint[] }>(
    `/sites/${siteId}/check-in-points/`,
    { method: "GET" },
  );
  return data.check_in_points;
}

export async function createCheckInPoint(
  siteId: string,
  input: { name: string; description?: string },
): Promise<CheckInPoint> {
  const data = await apiDataRequest<{ check_in_point: CheckInPoint }>(
    `/sites/${siteId}/check-in-points/`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.check_in_point;
}

export async function fetchMyAttendanceToday(
  projectId: string,
  date?: string,
): Promise<WorkerTodayActivity> {
  const query = new URLSearchParams({ project_id: projectId });
  if (date) query.set("date", date);
  const data = await apiDataRequest<{ activity: WorkerTodayActivity }>(
    `/attendance/me/today/?${query.toString()}`,
    { method: "GET" },
  );
  return data.activity;
}

export async function clockAttendance(input: {
  project_id: string;
  event_type: "check_in" | "check_out" | "break_start" | "break_end";
  check_in_point_code?: string;
  notes?: string;
}): Promise<{ activity: WorkerTodayActivity; warning?: { code?: string; message?: string }; event_id?: string }> {
  return apiDataRequest("/attendance/clock/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function qrScanCheckIn(input: {
  project_id: string;
  check_in_point_code: string;
}): Promise<{
  activity: WorkerTodayActivity;
  recent_scans?: { worker_name: string; event_at: string; location: string }[];
  warning?: { code?: string; message?: string };
  event_id?: string;
}> {
  return apiDataRequest("/attendance/qr-scan/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
