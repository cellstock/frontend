import { InventoryEditPage } from "@/components/inventory/InventoryEditPage";

export default async function EditInventoryOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  return <InventoryEditPage offerId={decodeURIComponent(offerId)} />;
}
