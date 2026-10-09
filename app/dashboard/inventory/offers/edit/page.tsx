"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { InventoryEditPage } from "@/components/inventory/InventoryEditPage";
function EditOffer() {
  const offerId = useSearchParams().get("offerId");
  if (!offerId)
    return (
      <p role="alert" className="p-8">
        No offer selected.
      </p>
    );
  return <InventoryEditPage key={offerId} offerId={offerId} />;
}
export default function EditInventoryOfferPage() {
  return (
    <Suspense fallback={null}>
      <EditOffer />
    </Suspense>
  );
}
