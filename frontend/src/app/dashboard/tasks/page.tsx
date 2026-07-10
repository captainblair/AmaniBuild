import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export const metadata = { title: "Tasks" };

export default function TasksPlaceholderPage() {
  return (
    <ModulePlaceholder
      title="Tasks"
      description="Task boards and assignments land in a later phase."
    />
  );
}
