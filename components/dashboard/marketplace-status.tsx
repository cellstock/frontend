"use client";
import { useI18n } from "@/components/i18n/language-provider";
import { ArrowRight, Store } from "lucide-react";
import Link from "@/components/ui/AppLink";
import type {
  MarketplaceConnectionStatus,
  MarketplaceSummary,
} from "@/types/dashboard";

const connectionStyles: Record<
  MarketplaceConnectionStatus,
  { label: string; indicator: string }
> = {
  connected: { label: "Connected", indicator: "bg-emerald-500" },
  pending: { label: "Pending", indicator: "bg-amber-500" },
  testing: { label: "Testing", indicator: "bg-amber-500 animate-pulse" },
  failed: { label: "Connection failed", indicator: "bg-red-500" },
  disabled: { label: "Disabled", indicator: "bg-slate-400" },
  disconnected: { label: "Not connected", indicator: "bg-slate-400" },
};

export function MarketplaceStatus({
  marketplaces,
}: {
  marketplaces: MarketplaceSummary[];
}) {
  const { t, locale } = useI18n();
  const connected = marketplaces.filter(
    (marketplace) => marketplace.status === "connected",
  ).length;
  return (
    <aside className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">
              {t("Marketplace status")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {connected} {t("connected sales channels")}
            </p>
          </div>
          <Store className="h-5 w-5 text-blue-600" />
        </div>
        <div className="mt-5 space-y-3">
          {marketplaces.length === 0 && (
            <p className="text-sm text-slate-500">
              {t("No marketplaces available yet.")}
            </p>
          )}
          {marketplaces.map((marketplace) => {
            const status =
              connectionStyles[marketplace.status] ??
              connectionStyles.disconnected;
            return (
              <Link
                key={marketplace.id}
                href={`/dashboard/marketplaces/detail/?slug=${encodeURIComponent(marketplace.slug)}`}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {marketplace.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {marketplace.ordersThisMonth.toLocaleString(locale)}{" "}
                    {t("orders this month")}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <span
                      className={`h-2 w-2 rounded-full ${status.indicator}`}
                    />
                    {t(status.label)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
        <Link
          href="/dashboard/marketplaces"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("Manage marketplaces")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </aside>
  );
}
