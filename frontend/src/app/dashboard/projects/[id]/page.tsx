import { ProjectDetailPage } from "@/components/projects/ProjectDetailPage";
import "@/styles/projects.css";

export const metadata = { title: "Project" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return <ProjectDetailPage projectId={id} />;
}
