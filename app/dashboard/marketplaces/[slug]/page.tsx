"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { AlertCircle, ArrowLeft, RefreshCw, SearchX } from "lucide-react";
import Link from "@/components/ui/AppLink";
import { useParams } from "next/navigation";
import { useCallback } from "react";

import { MarketplaceDetails } from "@/components/marketplaces/MarketplaceDetails";
import { getMarketplace } from "@/lib/api/marketplaces";
import { useResource } from "@/components/dashboard/dashboard-provider";
import { ContentLoading } from "@/components/ui/ContentLoading";

export default function MarketplaceDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const loader = useCallback(
    (signal: AbortSignal) => getMarketplace(slug, signal),
    [slug],
  );
  const {
    data,
    error: requestError,
    isLoading,
    isRefreshing,
    refresh,
    revalidate,
  } = useResource(`marketplace:${slug}`, loader);
  const marketplace = data?.data.marketplace;
  const error = requestError?.message;
  const isNotFound =
    (requestError as { status?: number } | null)?.status === 404;
  const loadMarketplace = refresh;

  if (isNotFound) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-200 text-slate-500">
            <SearchX className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
            {t("Marketplace not found")}
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
            {t(
              "The marketplace does not exist, is inactive, or the address may be incorrect.",
            )}
          </p>

          <Link
            href="/dashboard/marketplaces"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Return to marketplaces")}
          </Link>
        </div>
      </main>
    );
  }

  if (error && !marketplace) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950">
              {t("Unable to load marketplace")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error || t("The marketplace response was incomplete.")}
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard/marketplaces"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Go back")}
              </Link>

              <button
                type="button"
                onClick={() => void loadMarketplace()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <RefreshCw className="h-4 w-4" />
                {t("Try again")}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard/marketplaces"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Back to marketplaces")}
          </Link>

          <button
            type="button"
            disabled={isLoading || isRefreshing}
            onClick={() => void loadMarketplace()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />

            {isRefreshing ? t("Refreshing...") : t("Refresh")}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error} {t("Showing previous data. Use Refresh to retry.")}
          </p>
        )}
        {isLoading ? (
          <ContentLoading label={t("Loading marketplace details")} />
        ) : (
          marketplace && (
            <div aria-busy={isRefreshing}>
              <MarketplaceDetails
                key={marketplace.id}
                marketplace={marketplace}
                onMarketplaceChanged={revalidate}
              />
            </div>
          )
        )}
      </div>
    </main>
  );
}
