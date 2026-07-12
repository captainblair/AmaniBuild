import { diaryStatusLabel } from "@/lib/diary/labels";

const toneClass: Record<string, string> = {
  draft: "diary-badge--muted",
  submitted: "diary-badge--warn",
  approved: "diary-badge--good",
};

export function DiaryStatusBadge({ status }: { status: string }) {
  return (
    <span className={`diary-badge ${toneClass[status] ?? "diary-badge--muted"}`}>
      {diaryStatusLabel(status)}
    </span>
  );
}
