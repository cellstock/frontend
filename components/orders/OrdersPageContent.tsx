"use client";
import { useI18n } from "@/components/i18n/language-provider";

import {
  AlertCircle,
  CircleDollarSign,
  PackageOpen,
  RefreshCw,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { ContentLoading } from "@/components/ui/ContentLoading";
import { useResource } from "@/components/dashboard/dashboard-provider";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderPagination } from "@/components/orders/OrderPagination";
import { OrderTable } from "@/components/orders/OrderTable";
import { getMarketplaces } from "@/lib/api/marketplaces";
import { getOrders } from "@/lib/api/orders";
import { formatOrderCurrency } from "@/lib/orders/formatters";
import type {
  OrderFilterOption,
  OrderFilters as OrderFiltersType,
} from "@/types/order";

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export function OrdersPageContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const filters = useMemo<OrderFiltersType>(
    () => ({
      search: searchParams.get("search") || undefined,
      marketplace: searchParams.get("marketplace") || undefined,
      status: searchParams.get("status") || undefined,
      country_code: searchParams.get("country_code") || undefined,
      page: parsePositiveInteger(searchParams.get("page"), 1),
      per_page: parsePositiveInteger(searchParams.get("per_page"), 20),
    }),
    [searchParams],
  );

  const loader = useCallback(
    (signal: AbortSignal) => getOrders(filters, signal),
    [filters],
  );
  const {
    data,
    error: requestError,
    isLoading,
    isRefreshing,
    refresh: refreshOrders,
  } = useResource(`orders?${queryString}`, loader, true);
  const { data: marketplaceData } = useResource(
    "marketplaces",
    getMarketplaces,
  );
  const orders = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const error = requestError?.message ?? "";
  const marketplaceOptions = useMemo<OrderFilterOption[]>(() => {
    const options = new Map<string, OrderFilterOption>();
    for (const marketplace of [
      ...(marketplaceData?.data.connected ?? []),
      ...(marketplaceData?.data.available ?? []),
    ]) {
      options.set(marketplace.slug, {
        label: marketplace.name,
        value: marketplace.slug,
      });
    }
    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [marketplaceData]);

  const visibleOrderTotal = useMemo(
    () =>
      orders.reduce((total, order) => {
        const amount = Number.parseFloat(order.total_amount);

        return Number.isFinite(amount) ? total + amount : total;
      }, 0),
    [orders],
  );

  const visiblePaidOrders = useMemo(
    () => orders.filter((order) => order.payment.is_paid).length,
    [orders],
  );

  const displayCurrency = orders.length > 0 ? orders[0].currency : "EUR";

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <ShoppingBag className="h-4 w-4" />
              {t("Order management")}
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {t("Orders")}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {t(
                "Review and track synchronized orders across all connected marketplaces.",
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading || isRefreshing}
            onClick={refreshOrders}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />

            {isRefreshing ? t("Refreshing...") : t("Refresh")}
          </button>
        </div>

        {meta && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={ShoppingBag}
              label={t("Matching orders")}
              value={(meta?.total ?? 0).toLocaleString(locale)}
              tone="blue"
            />

            <SummaryCard
              icon={PackageOpen}
              label={t("Paid on this page")}
              value={visiblePaidOrders.toLocaleString(locale)}
              tone="emerald"
            />

            <SummaryCard
              icon={CircleDollarSign}
              label={t("Value on this page")}
              value={formatOrderCurrency(
                visibleOrderTotal,
                displayCurrency,
                locale,
              )}
              tone="violet"
            />
          </div>
        )}

        <div className="mt-6">
          <OrderFilters marketplaceOptions={marketplaceOptions} />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="font-semibold text-red-900">
                  {meta ? "Unable to update orders" : "Unable to load orders"}
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                  {meta &&
                    " Showing previous results; they may not match the selected filters."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshOrders}
              className="inline-flex w-fit items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              {t("Try again")}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="mt-6">
            <ContentLoading label={t("Loading orders")} />
          </div>
        ) : (
          meta && (
            <div className="mt-6 space-y-5" aria-busy={isRefreshing}>
              <div
                role="status"
                className="flex h-5 items-center gap-2 text-sm text-slate-500"
              >
                {isRefreshing && (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("Updating orders...")}
                  </>
                )}
              </div>
              <div
                className={`transition-opacity ${isRefreshing ? "opacity-60" : ""}`}
              >
                <OrderTable orders={orders} onUpdated={refreshOrders} />
              </div>

              <OrderPagination
                meta={meta}
                disabled={isRefreshing || Boolean(error)}
              />
            </div>
          )
        )}
      </div>
    </main>
  );
}

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "blue" | "emerald" | "violet";
}

const summaryToneStyles = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
};

function SummaryCard({ icon: Icon, label, value, tone }: SummaryCardProps) {
  const { t } = useI18n();
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${summaryToneStyles[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">{t(label)}</p>

      <p className="mt-1 truncate text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}
