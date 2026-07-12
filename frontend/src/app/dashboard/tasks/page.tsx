import { Suspense } from "react";
import { TasksPage } from "@/components/tasks/TasksPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/tasks.css";

export const metadata = { title: "Tasks" };

export default function TasksRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading tasks…" />
        </div>
      }
    >
      <TasksPage />
    </Suspense>
  );
}
