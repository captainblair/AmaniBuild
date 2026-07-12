import { Suspense } from "react";
import { ProjectsPage } from "@/components/projects/ProjectsPage";
import { Spinner } from "@/components/ui/Spinner";
import "@/styles/projects.css";

export const metadata = { title: "Projects" };

export default function ProjectsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading projects…" />
        </div>
      }
    >
      <ProjectsPage />
    </Suspense>
  );
}
