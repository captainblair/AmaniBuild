import { InventoryItemDetailPage } from "@/components/inventory/InventoryItemDetailPage";
import "@/styles/inventory.css";

export const metadata = { title: "Inventory item" };

type Props = { params: Promise<{ id: string }> };

export default async function InventoryItemRoutePage({ params }: Props) {
  const { id } = await params;
  return <InventoryItemDetailPage itemId={id} />;
}
