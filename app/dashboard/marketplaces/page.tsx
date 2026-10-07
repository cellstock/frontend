"use client";
import { useI18n } from "@/components/i18n/language-provider";

import {
  AlertCircle,
  CheckCircle2,
  PlugZap,
  RefreshCw,
  Store,
} from "lucide-react";
import { ContentLoading } from "@/components/ui/ContentLoading";
import { useResource } from "@/components/dashboard/dashboard-provider";

import { MarketplaceCard } from "@/components/marketplaces/MarketplaceCard";
import { getMarketplaces } from "@/lib/api/marketplaces";
import type { Marketplace, MarketplaceListData } from "@/types/marketplace";

const emptyMarketplaceData: MarketplaceListData = {
  connected: [],
  available: [],
};

function EmptySection({ type }: { type: "connected" | "available" }) {
  const { t } = useI18n();
  const isConnected = type === "connected";

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {isConnected ? (
          <PlugZap className="h-6 w-6" />
        ) : (
          <CheckCircle2 className="h-6 w-6" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        {isConnected
          ? t("No connected marketplaces")
          : t("All marketplaces are connected")}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {isConnected
          ? t(
              "Set up an available marketplace to manage its products, orders and inventory through CelleXa.",
            )
          : t(
              "There are no additional marketplace integrations available for setup.",
            )}
      </p>
    </div>
  );
}

export default function MarketplacesPage() {
  const { t } = useI18n();
  const {
    data,
    error: requestError,
    isLoading,
    isRefreshing,
    refresh,
  } = useResource("marketplaces", getMarketplaces);
  const marketplaces = data?.data ?? emptyMarketplaceData;
  const error = requestError?.message;
  const loadMarketplaces = refresh;

  const totalMarketplaces =
    marketplaces.connected.length + marketplaces.available.length;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <Store className="h-4 w-4" />
              {t("Integrations")}
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {t("Marketplaces")}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {t(
                "Connect and manage marketplace accounts, synchronization settings and integration health from one place.",
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadMarketplaces()}
            disabled={isLoading || isRefreshing}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? t("Refreshing...") : t("Refresh")}
          </button>
        </div>

        {data && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                {t("Total integrations")}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {totalMarketplaces}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <p className="text-sm font-medium text-emerald-700">
                {t("Connected")}
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">
                {marketplaces.connected.length}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <p className="text-sm font-medium text-blue-700">
                {t("Available")}
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-900">
                {marketplaces.available.length}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="font-semibold text-red-900">
                  {t("Unable to load marketplaces")}
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadMarketplaces()}
              className="inline-flex w-fit items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              {t("Try again")}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 space-y-10">
            <ContentLoading label={t("Loading marketplaces")} />
          </div>
        ) : (
          data && (
            <div className="mt-10 space-y-12">
              <MarketplaceSection
                title={t("Connected marketplaces")}
                description={t(
                  "Active marketplace accounts currently managed through CelleXa.",
                )}
                marketplaces={marketplaces.connected}
                type="connected"
              />

              <MarketplaceSection
                title={t("Available marketplaces")}
                description={t(
                  "Add another marketplace account to your CelleXa workspace.",
                )}
                marketplaces={marketplaces.available}
                type="available"
              />
            </div>
          )
        )}
      </div>
    </main>
  );
}

interface MarketplaceSectionProps {
  title: string;
  description: string;
  marketplaces: Marketplace[];
  type: "connected" | "available";
}

function MarketplaceSection({
  title,
  description,
  marketplaces,
  type,
}: MarketplaceSectionProps) {
  const { t } = useI18n();
  return (
    <section aria-labelledby={`${type}-marketplaces-heading`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2
            id={`${type}-marketplaces-heading`}
            className="text-lg font-bold text-slate-950"
          >
            {t(title)}
          </h2>

          <p className="mt-1 text-sm text-slate-500">{t(description)}</p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {marketplaces.length}
        </span>
      </div>

      {marketplaces.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {marketplaces.map((marketplace) => (
            <MarketplaceCard key={marketplace.id} marketplace={marketplace} />
          ))}
        </div>
      ) : (
        <EmptySection type={type} />
      )}
    </section>
  );
}
