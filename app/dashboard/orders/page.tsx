"use client";
import { useI18n } from "@/components/i18n/language-provider";
import { Suspense } from "react";
import { OrdersPageContent } from "@/components/orders/OrdersPageContent";
import { ContentLoading } from "@/components/ui/ContentLoading";

export default function OrdersPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<ContentLoading label={t("Opening orders")} />}>
      <OrdersPageContent />
    </Suspense>
  );
}
