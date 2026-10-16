"use client";

/**
 * MarketplaceSelectorRow
 *
 * Renders a row of marketplace icon-toggle buttons matching the Sellermania
 * reference screenshot:
 *
 *   [BM icon]  [Refurbed icon]  [+]
 *
 * • Each icon is clickable: toggles the marketplace on/off.
 * • Hovering shows a tooltip: "Click to enable/disable <Name>".
 * • When a marketplace is enabled a locale <select> appears below.
 * • The [+] button links to the marketplace connection settings page.
 * • Disabled (unavailable/unconnected) marketplaces show at reduced opacity
 *   and cannot be toggled.
 */

import { CirclePlus } from "lucide-react";
import Image from "@/components/ui/AppImage";
import AppLink from "@/components/ui/AppLink";
import { useState } from "react";
import type { InventoryMarket } from "@/types/inventory";
import type { Marketplace } from "@/types/marketplace";

// ── Helpers ───────────────────────────────────────────────────────────────────

function logoFor(slug: string): string | null {
  if (slug === "refurbed") return "/images/marketplaces/refurbed.png";
  if (slug === "back-market") return "/images/marketplaces/back-market.png";
  return null;
}

// ── Single marketplace icon button ───────────────────────────────────────────

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
    : `${marketplace.name} — listing creation unavailable`;

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

      {/* Green dot when enabled */}
      {enabled && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
      )}
    </button>
  );
}

// ── Locale select ─────────────────────────────────────────────────────────────

function ActiveBadge({ marketplace }: { marketplace: Marketplace }) {
  return (
    <div className="mt-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {marketplace.name} — Active
      </span>
      <p className="mt-2 text-xs text-slate-500">
        Manage prices and locale settings in{" "}
        <span className="font-semibold text-blue-600">
          Listing information by marketplaces
        </span>
        .
      </p>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface MarketplaceSelectorRowProps {
  /**
   * All connected + available marketplaces to show as icons.
   */
  marketplaces: Marketplace[];
  /**
   * Refurbed market locales — kept for future use / availability checks.
   */
  markets: InventoryMarket[];
  /**
   * Slug of the marketplace that is pre-enabled on mount.
   * Defaults to "refurbed".
   */
  defaultEnabledSlug?: string;
}

export function MarketplaceSelectorRow({
  marketplaces,
  markets: _markets,
  defaultEnabledSlug = "refurbed",
}: MarketplaceSelectorRowProps) {
  // Only one marketplace is "active" at a time for listing creation.
  // We store the slug of the currently enabled one.
  const [enabledSlug, setEnabledSlug] = useState<string>(
    defaultEnabledSlug,
  );

  // The marketplace whose locale select is shown
  const activeMarketplace = marketplaces.find(
    (mp) => mp.slug === enabledSlug,
  ) ?? marketplaces[0];

  // Currently only Refurbed supports listing creation
  function isAvailable(mp: Marketplace) {
    return mp.slug === "refurbed";
  }

  function toggle(mp: Marketplace) {
    if (!isAvailable(mp)) return;
    setEnabledSlug((current) => (current === mp.slug ? "" : mp.slug));
  }

  return (
    <div className="md:col-span-2">
      {/* ── Icon row ── */}
      <div className="flex items-center gap-2">
        {marketplaces.map((mp) => (
          <MarketplaceIcon
            key={mp.id}
            marketplace={mp}
            enabled={enabledSlug === mp.slug}
            available={isAvailable(mp)}
            onToggle={() => toggle(mp)}
          />
        ))}

        {/* + button: link to add a new marketplace */}
        <AppLink
          href="/dashboard/marketplaces"
          title="Connect a new marketplace"
          aria-label="Connect a new marketplace"
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <CirclePlus className="h-5 w-5" />
        </AppLink>
      </div>

      {/* ── Active badge — shown when a marketplace is enabled ── */}
      {enabledSlug && activeMarketplace && (
        <ActiveBadge marketplace={activeMarketplace} />
      )}

      {!enabledSlug && (
        <p className="mt-3 text-sm text-amber-700">
          Click a marketplace icon above to enable it for this listing.
        </p>
      )}
    </div>
  );
}
