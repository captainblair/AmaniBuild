import { TaskDetailPage } from "@/components/tasks/TaskDetailPage";
import "@/styles/tasks.css";

export const metadata = { title: "Task" };

type Props = { params: Promise<{ id: string }> };

export default async function TaskDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return <TaskDetailPage taskId={id} />;
}
