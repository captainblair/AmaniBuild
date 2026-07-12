import { ClientPortalProjectPage } from "@/components/portal/ClientPortalProjectPage";
import "@/styles/portal.css";

export const metadata = { title: "Project progress" };

type Props = { params: Promise<{ projectId: string }> };

export default async function ClientPortalProjectRoutePage({ params }: Props) {
  const { projectId } = await params;
  return <ClientPortalProjectPage projectId={projectId} />;
}
