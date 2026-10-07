"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { MarketplaceStatusBadge } from "@/components/marketplaces/MarketplaceStatusBadge";
import {
  MarketplaceApiError,
  getMarketplaceSyncRun,
  synchronizeMarketplace,
} from "@/lib/api/marketplaces";
import type {
  MarketplaceCapability,
  SyncRun,
  SyncType,
} from "@/types/marketplace";

interface SyncMarketplaceButtonProps {
  slug: string;
  capabilities: MarketplaceCapability[];
  disabled?: boolean;
  onCompleted?: (message: string) => Promise<void> | void;
}

const syncTypeLabels: Record<SyncType, string> = {
  full: "Full synchronization",
  orders: "Orders only",
  products: "Products only",
  inventory: "Inventory only",
};

function formatDateTime(value: string | null, locale = "en"): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCount(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

export function SyncMarketplaceButton({
  slug,
  capabilities,
  disabled = false,
  onCompleted,
}: SyncMarketplaceButtonProps) {
  const { t, locale } = useI18n();
  const availableTypes = useMemo<SyncType[]>(
    () => [
      "full",
      ...capabilities.filter(
        (capability): capability is Exclude<SyncType, "full"> =>
          capability === "orders" ||
          capability === "products" ||
          capability === "inventory",
      ),
    ],
    [capabilities],
  );

  const [selectedType, setSelectedType] = useState<SyncType>("full");

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncRun, setSyncRun] = useState<SyncRun | null>(null);
  const [error, setError] = useState("");

  async function handleSynchronize() {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setError("");

    try {
      const response = await synchronizeMarketplace(slug, {
        type: selectedType,
      });

      setSyncRun(response.data.sync_run);
      const completedRun = await waitForSyncRun(response.data.sync_run);
      setSyncRun(completedRun);

      if (completedRun.status === "failed") {
        setError(
          completedRun.error_message || "Marketplace synchronization failed.",
        );
      } else {
        await onCompleted?.(
          "Marketplace synchronization completed successfully.",
        );
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof MarketplaceApiError
          ? caughtError.message
          : "Unable to synchronize the marketplace.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  async function waitForSyncRun(initialRun: SyncRun): Promise<SyncRun> {
    let currentRun = initialRun;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (currentRun.status === "completed" || currentRun.status === "failed") {
        return currentRun;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      const response = await getMarketplaceSyncRun(slug, currentRun.id);
      currentRun = response.data.sync_run;
      setSyncRun(currentRun);
    }

    throw new MarketplaceApiError(
      "The synchronization is still queued. Make sure the Laravel queue worker is running.",
      408,
      {},
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`sync-type-${slug}`} className="sr-only">
            {t("Synchronization type")}
          </label>

          <select
            id={`sync-type-${slug}`}
            value={selectedType}
            disabled={disabled || isSyncing}
            onChange={(event) =>
              setSelectedType(event.target.value as SyncType)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {t(syncTypeLabels[type])}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={disabled || isSyncing}
          onClick={() => void handleSynchronize()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isSyncing ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}

          {isSyncing ? t("Starting sync...") : t("Synchronize")}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {syncRun && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {t("Latest synchronization request")}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {syncTypeLabels[syncRun.type]}
              </p>
            </div>

            <MarketplaceStatusBadge status={syncRun.status} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <SyncRunValue
              label={t("Processed")}
              value={formatCount(syncRun.processed_count)}
            />

            <SyncRunValue
              label={t("Successful")}
              value={formatCount(syncRun.success_count)}
            />

            <SyncRunValue
              label={t("Failed")}
              value={formatCount(syncRun.failed_count)}
            />

            <SyncRunValue
              label={t("Started")}
              value={formatDateTime(syncRun.started_at, locale)}
            />

            <SyncRunValue
              label={t("Completed")}
              value={formatDateTime(syncRun.completed_at, locale)}
            />

            <SyncRunValue
              label={t("Created")}
              value={formatDateTime(syncRun.created_at, locale)}
            />
          </dl>

          {syncRun.error_message && (
            <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{syncRun.error_message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SyncRunValue({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{t(label)}</dt>

      <dd className="mt-1 text-sm font-semibold text-slate-700">{value}</dd>
    </div>
  );
}
