import { Suspense } from "react";
import { DiaryPage } from "@/components/diary/DiaryPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/diary.css";

export const metadata = { title: "Site Diary" };

export default function DiaryRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading diary…" />
        </div>
      }
    >
      <DiaryPage />
    </Suspense>
  );
}
