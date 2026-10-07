"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { useResource } from "@/components/dashboard/dashboard-provider";
import {
  CircleDollarSign,
  Clock3,
  RefreshCw,
  ShoppingBag,
  Store,
} from "lucide-react";
import Link from "@/components/ui/AppLink";
import { ContentLoading } from "@/components/ui/ContentLoading";
import { MarketplaceStatus } from "@/components/dashboard/marketplace-status";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { StatisticCard } from "@/components/dashboard/statistic-card";
import { getDashboardData } from "@/lib/dashboard/dashboard-data";
import {
  formatOrderCurrency,
  formatOrderDateTime,
} from "@/lib/orders/formatters";

export function DashboardContent() {
  const { t, locale } = useI18n();
  const {
    data,
    error: requestError,
    isLoading,
    isRefreshing,
    refresh,
  } = useResource("dashboard", getDashboardData);
  const error = requestError?.message;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-sm font-semibold text-blue-600">
              {t("Dashboard overview")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {t("Welcome back")}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t(
                "Your latest synchronized orders and marketplace connections.",
              )}
            </p>
            <p role="status" className="mt-2 min-h-5 text-xs text-slate-400">
              {isRefreshing
                ? t("Updating dashboard...")
                : data
                  ? `Updated ${formatOrderDateTime(data.updatedAt, locale)}`
                  : t("Dashboard unavailable")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? t("Refreshing...") : t("Refresh")}
            </button>
            <Link
              href="/dashboard/marketplaces"
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {t("Manage marketplaces")}
            </Link>
          </div>
        </header>
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            <p>
              {error}
              {data && " Showing the last successfully loaded data."}
            </p>
            <button
              type="button"
              onClick={refresh}
              disabled={isRefreshing}
              className="mt-2 font-semibold underline disabled:opacity-60"
            >
              {t("Try again")}
            </button>
          </div>
        )}
        {isLoading && <ContentLoading label={t("Loading dashboard data")} />}
        {data && (
          <div
            aria-busy={isRefreshing}
            className={`transition-opacity ${isRefreshing ? "opacity-70" : ""}`}
          >
            <section
              aria-label={t("Marketplace statistics")}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <StatisticCard
                title={t("Total order value")}
                value={
                  data.summary.orderValues.length
                    ? data.summary.orderValues
                        .map(({ currency, total }) =>
                          currency
                            ? formatOrderCurrency(total, currency, locale)
                            : `${total} (currency unavailable)`,
                        )
                        .join(" / ")
                    : "No orders yet"
                }
                description={t(
                  "All imported orders, including cancelled and refunded",
                )}
                icon={CircleDollarSign}
                iconClassName="bg-blue-50 text-blue-600"
              />
              <StatisticCard
                title={t("Total orders")}
                value={data.summary.totalOrders.toLocaleString(locale)}
                description={t("All synchronized orders")}
                icon={ShoppingBag}
                iconClassName="bg-violet-50 text-violet-600"
              />
              <StatisticCard
                title={t("Connected marketplaces")}
                value={data.summary.connectedMarketplaces.toLocaleString(
                  locale,
                )}
                description={t("Connections with connected status")}
                icon={Store}
                iconClassName="bg-emerald-50 text-emerald-600"
              />
              <StatisticCard
                title={t("Pending orders")}
                value={data.summary.pendingOrders.toLocaleString(locale)}
                description={t("Orders with New or Pending status")}
                icon={Clock3}
                iconClassName="bg-amber-50 text-amber-600"
                attention={data.summary.pendingOrders > 0}
              />
            </section>
            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <RecentOrders orders={data.recentOrders} />
              <MarketplaceStatus marketplaces={data.marketplaces} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
