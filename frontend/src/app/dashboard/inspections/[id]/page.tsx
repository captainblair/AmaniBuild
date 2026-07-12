import { InspectionDetailPage } from "@/components/inspections/InspectionDetailPage";
import "@/styles/inspections.css";

export const metadata = { title: "Inspection" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InspectionDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return <InspectionDetailPage inspectionId={id} />;
}
