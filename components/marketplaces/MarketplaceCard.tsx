"use client";
import { useI18n } from "@/components/i18n/language-provider";
import {
  ArrowUpRight,
  Box,
  PackageSearch,
  ShoppingBag,
  Store,
} from "lucide-react";
import Image from "@/components/ui/AppImage";
import Link from "@/components/ui/AppLink";

import { MarketplaceStatusBadge } from "@/components/marketplaces/MarketplaceStatusBadge";
import type { Marketplace, MarketplaceCapability } from "@/types/marketplace";

interface MarketplaceCardProps {
  marketplace: Marketplace;
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
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-lg font-bold text-white shadow-md shadow-blue-500/20">
      {marketplace.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function MarketplaceCard({ marketplace }: MarketplaceCardProps) {
  const { t, locale } = useI18n();
  const connection = marketplace.connection;

  const status = marketplace.is_connected
    ? (connection?.status ?? "connected")
    : "available";

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <MarketplaceLogo marketplace={marketplace} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900">
              {marketplace.name}
            </h3>

            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              {t("Marketplace integration")}
            </p>
          </div>
        </div>

        <MarketplaceStatusBadge
          status={status}
          label={
            marketplace.is_connected ? connection?.status_label : undefined
          }
        />
      </div>

      <p className="mt-5 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">
        {marketplace.description ||
          `Connect ${marketplace.name} to manage its marketplace activity from CelleXa.`}
      </p>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {t("Supported features")}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {marketplace.capabilities.length > 0 ? (
            marketplace.capabilities.map((capability) => {
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
            })
          ) : (
            <span className="text-sm text-slate-500">
              {t("No capabilities configured")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">{t("Last synchronized")}</p>

          <p className="mt-1 truncate text-sm font-medium text-slate-700">
            {formatDateTime(connection?.last_synced_at ?? null, locale)}
          </p>
        </div>

        <Link
          href={`/dashboard/marketplaces/detail/?slug=${encodeURIComponent(
            marketplace.slug,
          )}`}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 ${
            marketplace.is_connected
              ? "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-100"
              : "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 focus:ring-blue-100"
          }`}
        >
          {marketplace.is_connected ? t("View") : t("Set up")}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {connection?.last_error && (
        <div className="mt-4 flex gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
          <Store className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="line-clamp-2">{connection.last_error}</span>
        </div>
      )}
    </article>
  );
}
