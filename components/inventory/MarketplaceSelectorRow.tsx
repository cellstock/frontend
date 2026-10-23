"use client";

/**
 * MarketplaceSelectorRow
 *
 * Row of marketplace icon toggles. Connected marketplaces can be enabled so
 * Validate creates/updates the listing with the same quantity on each.
 */

import { CirclePlus } from "lucide-react";
import Image from "@/components/ui/AppImage";
import AppLink from "@/components/ui/AppLink";
import { useState } from "react";
import type { InventoryMarket } from "@/types/inventory";
import type { Marketplace } from "@/types/marketplace";

function logoFor(slug: string): string | null {
  if (slug === "refurbed") return "/images/marketplaces/refurbed.png";
  if (slug === "back-market") return "/images/marketplaces/back-market.png";
  return null;
}

function MarketplaceIcon({
  marketplace,
  enabled,
  available,
  onToggle,
}: {
  marketplace: Marketplace;
  enabled: boolean;
  available: boolean;
  onToggle: () => void;
}) {
  const logo = logoFor(marketplace.slug);
  const tooltip = available
    ? `Click to ${enabled ? "disable" : "enable"} ${marketplace.name}`
    : `${marketplace.name} — connect this marketplace first`;

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      disabled={!available}
      onClick={onToggle}
      className={[
        "relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition",
        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
        enabled
          ? "border-blue-500 shadow-sm shadow-blue-200"
          : "border-slate-300",
        available
          ? "cursor-pointer hover:border-blue-400"
          : "cursor-not-allowed opacity-40",
      ].join(" ")}
    >
      {logo ? (
        <Image
          src={logo}
          alt={marketplace.name}
          width={28}
          height={28}
          className="h-7 w-7 rounded-full object-contain"
        />
      ) : (
        <span className="text-xs font-bold text-slate-600">
          {marketplace.name.charAt(0)}
        </span>
      )}
      {enabled && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
      )}
    </button>
  );
}

export interface MarketplaceSelectorRowProps {
  marketplaces: Marketplace[];
  markets: InventoryMarket[];
  defaultEnabledSlug?: string;
}

export function MarketplaceSelectorRow({
  marketplaces,
  markets: _markets,
  defaultEnabledSlug = "refurbed",
}: MarketplaceSelectorRowProps) {
  const connected = marketplaces.filter(
    (mp) =>
      mp.slug === "refurbed" ||
      mp.slug === "back-market",
  );

  const initiallyEnabled = connected.some((mp) => mp.slug === defaultEnabledSlug)
    ? [defaultEnabledSlug]
    : connected[0]
      ? [connected[0].slug]
      : [];

  const [enabledSlugs, setEnabledSlugs] = useState<string[]>(initiallyEnabled);

  function isAvailable(mp: Marketplace) {
    return (
      mp.is_connected &&
      (mp.slug === "refurbed" || mp.slug === "back-market")
    );
  }

  function toggle(mp: Marketplace) {
    if (!isAvailable(mp)) return;
    setEnabledSlugs((current) =>
      current.includes(mp.slug)
        ? current.filter((slug) => slug !== mp.slug)
        : [...current, mp.slug],
    );
  }

  return (
    <div className="md:col-span-2">
      {enabledSlugs.map((slug) => (
        <input key={slug} type="hidden" name="marketplace_slugs[]" value={slug} />
      ))}

      <div className="flex items-center gap-2">
        {marketplaces.map((mp) => (
          <MarketplaceIcon
            key={mp.id}
            marketplace={mp}
            enabled={enabledSlugs.includes(mp.slug)}
            available={isAvailable(mp)}
            onToggle={() => toggle(mp)}
          />
        ))}

        <AppLink
          href="/dashboard/marketplaces"
          title="Connect a new marketplace"
          aria-label="Connect a new marketplace"
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <CirclePlus className="h-5 w-5" />
        </AppLink>
      </div>

      {enabledSlugs.length > 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Selling on{" "}
          <span className="font-semibold text-slate-800">
            {enabledSlugs
              .map(
                (slug) =>
                  marketplaces.find((mp) => mp.slug === slug)?.name || slug,
              )
              .join(", ")}
          </span>
          . The same quantity is shared across these marketplaces.
        </p>
      ) : (
        <p className="mt-3 text-sm text-amber-700">
          Click a marketplace icon above to enable it for this listing.
        </p>
      )}
    </div>
  );
}
