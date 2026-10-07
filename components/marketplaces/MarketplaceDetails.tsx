"use client";
import { useI18n } from "@/components/i18n/language-provider";

import {
  AlertCircle,
  Box,
  Boxes,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  PackageSearch,
  MapPin,
  Settings2,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { ConnectMarketplaceModal } from "@/components/marketplaces/ConnectMarketplaceModal";
import { ConnectionSettingsForm } from "@/components/marketplaces/ConnectionSettingsForm";
import { DisconnectMarketplaceButton } from "@/components/marketplaces/DisconnectMarketplaceButton";
import { MarketplaceStatusBadge } from "@/components/marketplaces/MarketplaceStatusBadge";
import { RefurbedWebhookSettings } from "@/components/marketplaces/RefurbedWebhookSettings";
import { SyncMarketplaceButton } from "@/components/marketplaces/SyncMarketplaceButton";
import { TestConnectionButton } from "@/components/marketplaces/TestConnectionButton";
import { updateMarketplaceConnection } from "@/lib/api/marketplaces";
import type {
  Marketplace,
  MarketplaceCapability,
  MarketplaceFormValues,
  UpdateMarketplaceConnectionRequest,
} from "@/types/marketplace";

interface MarketplaceDetailsProps {
  marketplace: Marketplace;
  onMarketplaceChanged: () => Promise<void>;
}

const capabilityDetails: Record<
  MarketplaceCapability,
  {
    label: string;
    icon: typeof ShoppingBag;
  }
> = {
  orders: {
    label: "Orders",
    icon: ShoppingBag,
  },
  products: {
    label: "Products",
    icon: PackageSearch,
  },
  inventory: {
    label: "Inventory",
    icon: Box,
  },
};

function formatDateTime(value: string | null, locale = "en"): string {
  if (!value) {
    return "Never";
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

function MarketplaceLogo({ marketplace }: { marketplace: Marketplace }) {
  if (marketplace.logo) {
    return (
      <Image
        src={marketplace.logo}
        alt={`${marketplace.name} logo`}
        width={64}
        height={64}
        className="h-16 w-16 object-contain"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-xl font-black text-white shadow-lg shadow-blue-600/20">
      {marketplace.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function MarketplaceDetails({
  marketplace,
  onMarketplaceChanged,
}: MarketplaceDetailsProps) {
  const { t, locale } = useI18n();
  const connection = marketplace.connection;
  const supportedSyncCapabilities: MarketplaceCapability[] =
    marketplace.slug === "refurbed" ? ["orders"] : marketplace.capabilities;

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function refreshMarketplace(message?: string) {
    await onMarketplaceChanged();

    if (message) {
      setFeedback({
        type: "success",
        message,
      });
    }
  }

  async function handleUpdate(values: MarketplaceFormValues) {
    if (!connection) {
      return;
    }

    const input: UpdateMarketplaceConnectionRequest = {
      account_name: values.account_name,
      settings: values.settings,
      ...(values.api_key
        ? {
            credentials: {
              api_key: values.api_key,
            },
          }
        : {}),
    };

    const response = await updateMarketplaceConnection(marketplace.slug, input);

    setIsEditing(false);

    await refreshMarketplace(
      response.message || "Marketplace settings updated successfully.",
    );
  }

  const status = marketplace.is_connected
    ? (connection?.status ?? "connected")
    : "available";

  const refurbedMarkets = connection?.settings.markets ?? [];
  const managesOrders = refurbedMarkets.some((market) => market.manage_orders);
  const managesOffers = refurbedMarkets.some((market) => market.manage_offers);
  const refurbedSyncItems = [
    {
      key: "orders",
      label: "Orders",
      icon: ShoppingBag,
      enabled: Boolean(connection?.settings.sync_orders && managesOrders),
      mode: "Automatic and instant notifications",
    },
    {
      key: "offers",
      label: "Offers",
      icon: PackageSearch,
      enabled: managesOffers,
      mode: "Inventory synchronization",
    },
    {
      key: "stock",
      label: "Stock quantities",
      icon: Boxes,
      enabled: managesOffers,
      mode: "Inventory synchronization",
    },
    {
      key: "shipping-profiles",
      label: "Shipping profiles",
      icon: Truck,
      enabled: true,
      mode: "Shipping profile synchronization",
    },
    {
      key: "carriers",
      label: "Shipping carriers",
      icon: Store,
      enabled: true,
      mode: "Shipping profile synchronization",
    },
    {
      key: "merchant-addresses",
      label: "Merchant addresses",
      icon: MapPin,
      enabled: true,
      mode: "Loaded and cached when required",
    },
  ];

  return (
    <>
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}

            <p className="text-sm font-medium">{feedback.message}</p>
          </div>

          <button
            type="button"
            aria-label={t("Dismiss notification")}
            onClick={() => setFeedback(null)}
            className="rounded-lg p-1 transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative border-b border-slate-200 px-6 py-7 sm:px-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-2">
                <MarketplaceLogo marketplace={marketplace} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    {marketplace.name}
                  </h1>

                  <MarketplaceStatusBadge
                    status={status}
                    label={
                      marketplace.is_connected
                        ? connection?.status_label
                        : undefined
                    }
                  />
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {marketplace.description ||
                    `Manage the ${marketplace.name} integration through CelleXa.`}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {marketplace.capabilities.map((capability) => {
                    const details = capabilityDetails[capability];
                    const Icon = details.icon;

                    return (
                      <span
                        key={capability}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t(details.label)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {!marketplace.is_connected && (
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <ExternalLink className="h-4 w-4" />
                {t("Set up connection")}
              </button>
            )}
          </div>
        </div>

        {!marketplace.is_connected || !connection ? (
          <div className="px-6 py-12 text-center sm:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Store className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-950">
              {t("Connect this marketplace")}
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              {t(
                "Add the marketplace account credentials and choose which supported data CelleXa should synchronize.",
              )}
            </p>

            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              {t("Connect")}
              {marketplace.name}
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8 p-6 sm:p-8">
              {connection.last_error && (
                <div
                  role="alert"
                  className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="text-sm font-semibold">
                      {t("Marketplace connection issue")}
                    </p>

                    <p className="mt-1 text-sm leading-6">
                      {connection.last_error}
                    </p>
                  </div>
                </div>
              )}

              <section aria-labelledby="connection-information">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2
                      id="connection-information"
                      className="text-lg font-bold text-slate-950"
                    >
                      {t("Connection information")}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {t("Marketplace account and connection details.")}
                    </p>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    >
                      <Edit3 className="h-4 w-4" />
                      {t("Edit settings")}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <ConnectionSettingsForm
                      mode="update"
                      marketplaceSlug={marketplace.slug}
                      capabilities={supportedSyncCapabilities}
                      initialAccountName={connection.account_name}
                      initialSettings={connection.settings}
                      onCancel={() => setIsEditing(false)}
                      onSubmit={handleUpdate}
                    />
                  </div>
                ) : (
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <InformationItem
                      icon={UserRound}
                      label={t("Account name")}
                      value={connection.account_name}
                    />

                    <InformationItem
                      icon={ExternalLink}
                      label={t("External account ID")}
                      value={connection.external_account_id || "Not available"}
                    />

                    <InformationItem
                      icon={Clock3}
                      label={t("Last connection test")}
                      value={formatDateTime(connection.last_tested_at, locale)}
                    />

                    <InformationItem
                      icon={Settings2}
                      label={t("Last synchronization")}
                      value={formatDateTime(connection.last_synced_at, locale)}
                    />
                  </dl>
                )}
              </section>

              {!isEditing && (
                <section aria-labelledby="sync-settings">
                  <h2
                    id="sync-settings"
                    className="text-lg font-bold text-slate-950"
                  >
                    {t("Enabled synchronization")}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {marketplace.slug === "refurbed"
                      ? "Data types CelleXa can synchronize with this Refurbed account."
                      : t(
                          "Data types currently enabled for automatic synchronization.",
                        )}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {(marketplace.slug === "refurbed"
                      ? refurbedSyncItems
                      : supportedSyncCapabilities.map((capability) => ({
                          key: capability,
                          label: capabilityDetails[capability].label,
                          icon: capabilityDetails[capability].icon,
                          enabled: Boolean(
                            connection.settings[
                              `sync_${capability}` as keyof typeof connection.settings
                            ],
                          ),
                          mode: "Automatic synchronization",
                        }))
                    ).map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.key}
                          className={`rounded-2xl border p-4 ${
                            item.enabled
                              ? "border-emerald-200 bg-emerald-50/70"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              item.enabled
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}
                          />

                          <p className="mt-3 text-sm font-semibold text-slate-800">
                            {t(item.label)}
                          </p>

                          <p
                            className={`mt-1 text-xs font-medium ${
                              item.enabled
                                ? "text-emerald-700"
                                : "text-slate-500"
                            }`}
                          >
                            {item.enabled ? item.mode : "Disabled"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {!isEditing && marketplace.slug === "refurbed" && (
                <RefurbedWebhookSettings slug={marketplace.slug} />
              )}

              <section aria-labelledby="manual-sync">
                <h2
                  id="manual-sync"
                  className="text-lg font-bold text-slate-950"
                >
                  {t("Manual synchronization")}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {t(
                    "Queue a full synchronization or synchronize one supported data type.",
                  )}
                </p>

                <div className="mt-5">
                  <SyncMarketplaceButton
                    slug={marketplace.slug}
                    capabilities={supportedSyncCapabilities}
                    disabled={isEditing}
                    onCompleted={(message) => refreshMarketplace(message)}
                  />
                </div>
              </section>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  {t("Connection health")}
                </h2>

                <div className="mt-4">
                  <MarketplaceStatusBadge
                    status={connection.status}
                    label={connection.status_label}
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {t(
                    "Test the saved marketplace credentials and connection availability.",
                  )}
                </p>

                <div className="mt-5">
                  <TestConnectionButton
                    slug={marketplace.slug}
                    disabled={isEditing}
                    onCompleted={() => onMarketplaceChanged()}
                  />
                </div>
              </div>

              <div className="my-7 border-t border-slate-200" />

              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  {t("Credentials")}
                </h2>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">
                    {t("API credential saved")}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {t(
                      "For security, CelleXa never displays the saved API key. Use Edit settings to replace it.",
                    )}
                  </p>
                </div>
              </div>

              <div className="my-7 border-t border-slate-200" />

              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  {t("Danger zone")}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("Disconnecting stops future marketplace synchronization.")}
                </p>

                <div className="mt-5">
                  <DisconnectMarketplaceButton
                    slug={marketplace.slug}
                    marketplaceName={marketplace.name}
                    disabled={isEditing}
                    onDisconnected={(message) => refreshMarketplace(message)}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <ConnectMarketplaceModal
        open={isConnectModalOpen}
        marketplace={marketplace}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={(message) => refreshMarketplace(message)}
      />
    </>
  );
}

interface InformationItemProps {
  icon: typeof UserRound;
  label: string;
  value: string;
}

function InformationItem({ icon: Icon, label, value }: InformationItemProps) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <dt className="text-xs font-semibold uppercase tracking-[0.1em]">
          {t(label)}
        </dt>
      </div>

      <dd className="mt-2 break-words text-sm font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  );
}
