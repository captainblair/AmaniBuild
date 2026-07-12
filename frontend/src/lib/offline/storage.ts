const DRAFT_PREFIX = "amanibuild:diary-draft:";
const CLOCK_QUEUE_KEY = "amanibuild:clock-queue";

export type DiaryDraftPayload = {
  entry_date: string;
  weather_condition: string;
  weather_temperature_c: string;
  workforce_count: string;
  working_hours: string;
  work_description: string;
  progress_percent: string;
  delays: string;
  safety_concerns: string;
  required_actions: string;
  site_conditions_notes: string;
  labour: string[];
  equipment: string[];
  photos: { url: string; caption?: string }[];
  saved_at: string;
};

export function diaryDraftKey(projectId: string, entryDate: string): string {
  return `${DRAFT_PREFIX}${projectId}:${entryDate}`;
}

export function loadDiaryDraft(projectId: string, entryDate: string): DiaryDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(diaryDraftKey(projectId, entryDate));
    if (!raw) return null;
    return JSON.parse(raw) as DiaryDraftPayload;
  } catch {
    return null;
  }
}

export function saveDiaryDraft(
  projectId: string,
  entryDate: string,
  draft: Omit<DiaryDraftPayload, "saved_at">,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      diaryDraftKey(projectId, entryDate),
      JSON.stringify({ ...draft, saved_at: new Date().toISOString() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearDiaryDraft(projectId: string, entryDate: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(diaryDraftKey(projectId, entryDate));
  } catch {
    /* ignore */
  }
}

export type QueuedClockAction = {
  id: string;
  project_id: string;
  event_type: "check_in" | "check_out" | "break_start" | "break_end";
  check_in_point_code?: string;
  latitude?: number;
  longitude?: number;
  queued_at: string;
};

export function loadClockQueue(): QueuedClockAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLOCK_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedClockAction[];
  } catch {
    return [];
  }
}

export function saveClockQueue(items: QueuedClockAction[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLOCK_QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function enqueueClockAction(action: Omit<QueuedClockAction, "id" | "queued_at">): void {
  const queue = loadClockQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queued_at: new Date().toISOString(),
  });
  saveClockQueue(queue);
}
