import { PurchaseRequestDetailPage } from "@/components/procurement/PurchaseRequestDetailPage";
import "@/styles/procurement.css";

export const metadata = { title: "Purchase request" };

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseRequestDetailRoute({ params }: Props) {
  const { id } = await params;
  return <PurchaseRequestDetailPage requestId={id} />;
}
