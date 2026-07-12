export const DIARY_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
] as const;

export const WEATHER_OPTIONS = [
  { value: "sunny", label: "Sunny" },
  { value: "partly_cloudy", label: "Partly cloudy" },
  { value: "cloudy", label: "Cloudy" },
  { value: "rainy", label: "Rainy" },
  { value: "extreme", label: "Extreme" },
] as const;

export const LABOUR_PRESETS = [
  "Concrete works",
  "Formwork",
  "Steel fixing",
  "Masonry",
  "Carpentry",
  "Electrical",
  "Plumbing",
];

export const EQUIPMENT_PRESETS = [
  "Tower crane",
  "Concrete pump",
  "Excavator",
  "Mixer",
  "Scaffolding",
];

export function diaryStatusLabel(status: string): string {
  return DIARY_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function weatherLabel(value: string): string {
  return WEATHER_OPTIONS.find((w) => w.value === value)?.label ?? value.replaceAll("_", " ");
}

export function formatDiaryDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
