import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export const metadata = { title: "Projects" };

export default function ProjectsPlaceholderPage() {
  return (
    <ModulePlaceholder
      title="Projects"
      description="List and detail views for your construction projects land in FE Phase 5."
      phaseHint="Wireframes: projects list page, project detail overview"
    />
  );
}
