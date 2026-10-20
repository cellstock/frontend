"use client";

/**
 * MarketplaceListingPanel
 *
 * Shared "Listing information by marketplaces" panel used in both
 * AddInventoryItemPage and InventoryEditPage.
 *
 * Layout mirrors the Sellermania reference screenshot:
 *   Left nav  – one row per connected marketplace
 *   Right pane – per-marketplace fields:
 *     • Activate on marketplace (checkbox)
 *     • EAN
 *     • Top price / Bottom price  (money)
 *     • Block price               (checkbox)
 *     • Battery condition         (select)
 *     • * Taxation                (select)
 *     • * Warranty delay          (select)
 *     • * Shipping Profile Id     (text)
 *     • Refurbed Id               (text)
 *   Then one collapsible sub-section per Refurbed locale (AT, BE, …):
 *     • Top price / Bottom price
 *     • Block price (at your top price)
 *     • Don't send quantity
 *     • Don't send price
 */

import { Info } from "lucide-react";
import Image from "@/components/ui/AppImage";
import { ReactNode, useState } from "react";
import type { InventoryMarket } from "@/types/inventory";
import type { Marketplace } from "@/types/marketplace";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketplaceLocaleDefaults {
  /** Top price (reference_price level) */
  price?: string;
  /** Bottom / minimum price */
  min_price?: string;
  block_price?: boolean;
  dont_send_quantity?: boolean;
  dont_send_price?: boolean;
}

/**
 * Initial values that seed the form when editing an existing offer.
 * Keyed by "marketplace-slug" (e.g. "refurbed") at the root level,
 * and by locale code (e.g. "AT") for per-locale overrides.
 */
export interface MarketplaceListingDefaults {
  /** Refurbed-level fields */
  activate?: boolean;
  ean?: string;
  top_price?: string;
  bottom_price?: string;
  block_price?: boolean;
  battery_condition?: string;
  taxation?: string;
  warranty_delay?: string;
  shipping_profile_id?: string;
  refurbed_id?: string;
  /** Per-locale price overrides, keyed by market code */
  locales?: Record<string, MarketplaceLocaleDefaults>;
}

interface MarketplaceListingPanelProps {
  /** All Refurbed market locales (AT, BE, DE …) */
  markets: InventoryMarket[];
  /** Connected + available marketplaces (for the left nav) */
  marketplaces: Marketplace[];
  /** Reference currency (EUR, GBP …) */
  currency: string;
  /** Pre-populated values when editing an existing offer */
  defaults?: MarketplaceListingDefaults;
  /** Field-level validation errors keyed by form field name */
  fieldErrors?: Record<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

const BATTERY_CONDITIONS = [
  "OPTIMAL",
  "VERY_GOOD",
  "GOOD",
  "ACCEPTABLE",
  "NOT_APPLICABLE",
];

const WARRANTY_DELAYS = ["3", "6", "12", "24", "36"];

function Label({
  children,
  required = false,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <span className="flex items-center gap-1 text-sm font-semibold text-slate-700">
      {required && <span className="text-red-500">*</span>}
      {children}
      {hint && (
        <span title={hint} className="cursor-help text-slate-400">
          <Info className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}

function FieldRow({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <Label required={required} hint={hint}>
        {label}
      </Label>
      <div className="w-full sm:max-w-xs">{children}</div>
    </div>
  );
}

function MoneyFieldRow({
  label,
  name,
  currency,
  defaultValue,
  hint,
  required,
  disabled,
  error,
}: {
  label: string;
  name: string;
  currency: string;
  defaultValue?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <FieldRow label={label} hint={hint} required={required}>
      <div
        className={`flex overflow-hidden rounded-xl border bg-white focus-within:ring-4 ${
          error
            ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-100"
            : "border-slate-300 focus-within:border-blue-500 focus-within:ring-blue-100"
        }`}
      >
        <span className="grid place-items-center border-r border-slate-300 px-3 text-sm font-bold text-slate-500">
          {currency}
        </span>
        <input
          name={name}
          type="number"
          min="0"
          step="0.01"
          required={required}
          disabled={disabled}
          defaultValue={defaultValue ?? ""}
          className="min-w-0 flex-1 px-4 py-3 text-sm outline-none disabled:bg-slate-100"
        />
      </div>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      )}
    </FieldRow>
  );
}

function CheckboxRow({
  label,
  name,
  defaultChecked,
  hint,
  disabled,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <Label hint={hint}>{label}</Label>
      <input
        type="checkbox"
        name={name}
        disabled={disabled}
        defaultChecked={defaultChecked ?? false}
        className="h-4 w-4 accent-blue-600"
      />
    </div>
  );
}

// ── Refurbed locale sub-section ───────────────────────────────────────────────

function LocaleSection({
  market,
  currency,
  defaults,
  disabled,
}: {
  market: InventoryMarket;
  currency: string;
  defaults?: MarketplaceLocaleDefaults;
  disabled?: boolean;
}) {
  const localeCurrency = market.currency_code || currency;
  const prefix = `mp_locale_${market.code}_`;
  const [blockPrice, setBlockPrice] = useState(defaults?.block_price ?? false);

  return (
    <fieldset
      disabled={disabled}
      className="border-t border-slate-200 pt-5 disabled:opacity-50"
    >
      <div className="mb-1 flex items-center gap-2">
        <h4 className="font-bold text-slate-800">Refurbed {market.code}</h4>
      </div>
      <p className="mb-3 text-xs text-blue-700">
        The activation of this locale is defined in the Shipping Profile created
        on Refurbed and used for this SKU.
      </p>

      <MoneyFieldRow
        label="Top price"
        name={`${prefix}price`}
        currency={localeCurrency}
        defaultValue={defaults?.price}
      />

      {/* Bottom price hidden when block price is checked */}
      {!blockPrice && (
        <MoneyFieldRow
          label="Bottom price"
          name={`${prefix}min_price`}
          currency={localeCurrency}
          defaultValue={defaults?.min_price}
        />
      )}

      <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
        <Label hint="Prevents automatic repricing below your top price for this locale.">
          Block price (at your top price)
        </Label>
        <input
          type="checkbox"
          name={`${prefix}block_price`}
          checked={blockPrice}
          onChange={(e) => setBlockPrice(e.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
      </div>

      <CheckboxRow
        label="Don't send quantity"
        name={`${prefix}dont_send_quantity`}
        defaultChecked={defaults?.dont_send_quantity}
        hint="Pauses stock updates for this locale."
      />
      <CheckboxRow
        label="Don't send price"
        name={`${prefix}dont_send_price`}
        defaultChecked={defaults?.dont_send_price}
        hint="Pauses price updates for this locale."
      />
    </fieldset>
  );
}

// ── Refurbed main panel ───────────────────────────────────────────────────────

function RefurbedPanel({
  markets,
  currency,
  defaults,
  fieldErrors,
}: {
  markets: InventoryMarket[];
  currency: string;
  defaults?: MarketplaceListingDefaults;
  fieldErrors?: Record<string, string>;
}) {
  // Controlled so toggling "Activate" immediately enables/disables all fields
  const [active, setActive] = useState(defaults?.activate ?? true);
  const [blockPrice, setBlockPrice] = useState(defaults?.block_price ?? false);

  return (
    <div>
      <h3 className="mb-4 text-center text-lg font-bold text-slate-900">
        Refurbed
      </h3>

      {/* ── Activate checkbox — always enabled ── */}
      <div className="flex items-center justify-between border-b border-slate-100 py-3">
        <Label hint="When unchecked the offer will be set inactive on Refurbed.">
          Activate on marketplace
        </Label>
        <input
          type="checkbox"
          name="mp_refurbed_activate"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
      </div>

      {/* ── All other fields disabled when not active ── */}
      <fieldset disabled={!active} className="disabled:opacity-50">
        <FieldRow
          label="EAN"
          hint="European Article Number used to match the product in the Refurbed catalog."
        >
          <input
            name="mp_refurbed_ean"
            type="text"
            defaultValue={defaults?.ean ?? ""}
            className={inputClass}
          />
        </FieldRow>

        <MoneyFieldRow
          label="Top price"
          name="mp_refurbed_top_price"
          currency={currency}
          defaultValue={defaults?.top_price}
          hint="Maximum selling price on Refurbed."
          error={fieldErrors?.["mp_refurbed_top_price"]}
        />

        {/* Bottom price hidden when block price is checked */}
        {!blockPrice && (
          <MoneyFieldRow
            label="Bottom price"
            name="mp_refurbed_bottom_price"
            currency={currency}
            defaultValue={defaults?.bottom_price}
            hint="Minimum selling price — repricing will not go below this."
          />
        )}

        <div className="flex items-center justify-between border-b border-slate-100 py-3">
          <Label hint="Locks the price at your top price, disabling automatic repricing.">
            Block price
          </Label>
          <input
            type="checkbox"
            name="mp_refurbed_block_price"
            checked={blockPrice}
            onChange={(e) => setBlockPrice(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
        </div>

        <FieldRow
          label="Battery condition"
          hint="Describes the battery health of the refurbished device."
        >
          <select
            name="mp_refurbed_battery_condition"
            defaultValue={defaults?.battery_condition ?? "OPTIMAL"}
            className={inputClass}
          >
            {BATTERY_CONDITIONS.map((v) => (
              <option key={v} value={v}>
                {v.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Taxation"
          required
          hint="Gross = price includes VAT. Marginal = VAT is calculated on the margin."
        >
          <select
            name="mp_refurbed_taxation"
            defaultValue={defaults?.taxation ?? "GROSS"}
            className={inputClass}
          >
            <option value="GROSS">Gross</option>
            <option value="MARGINAL">Marginal</option>
          </select>
        </FieldRow>

        <FieldRow
          label="Warranty delay"
          required
          hint="Warranty period in months provided with the item."
        >
          <select
            name="mp_refurbed_warranty_delay"
            defaultValue={defaults?.warranty_delay ?? "12"}
            className={inputClass}
          >
            {WARRANTY_DELAYS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Shipping Profile Id"
          required
          hint="The numeric ID of the Refurbed shipping profile assigned to this offer."
        >
          <input
            name="mp_refurbed_shipping_profile_id"
            type="text"
            defaultValue={defaults?.shipping_profile_id ?? ""}
            className={`${inputClass}${fieldErrors?.["mp_refurbed_shipping_profile_id"] ? " border-red-500 ring-1 ring-red-500" : ""}`}
          />
          {fieldErrors?.["mp_refurbed_shipping_profile_id"] && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {fieldErrors["mp_refurbed_shipping_profile_id"]}
            </p>
          )}
        </FieldRow>

        <FieldRow
          label="Refurbed Id"
          hint="Internal Refurbed offer ID, auto-assigned after the first sync."
        >
          <input
            name="mp_refurbed_id"
            type="text"
            defaultValue={defaults?.refurbed_id ?? ""}
            readOnly={!!defaults?.refurbed_id}
            className={`${inputClass} ${defaults?.refurbed_id ? "bg-slate-100 text-slate-500" : ""}`}
          />
        </FieldRow>

        {/* ── Per-locale sub-sections — also disabled when not active ── */}
        {markets.map((market) => (
          <LocaleSection
            key={market.code}
            market={market}
            currency={currency}
            defaults={defaults?.locales?.[market.code]}
            disabled={!active}
          />
        ))}
      </fieldset>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function MarketplaceListingPanel({
  markets,
  marketplaces,
  currency,
  defaults,
  fieldErrors,
}: MarketplaceListingPanelProps) {
  const supported = marketplaces.filter((mp) =>
    ["refurbed", "back-market"].includes(mp.slug),
  );
  const defaultSlug =
    supported.find((mp) => mp.slug === "refurbed")?.slug ||
    supported[0]?.slug ||
    "refurbed";
  const [activeSlug, setActiveSlug] = useState(defaultSlug);

  const otherMarketplaces = marketplaces.filter(
    (mp) => !["refurbed", "back-market"].includes(mp.slug),
  );

  const logoFor = (slug: string) => {
    if (slug === "refurbed") return "/images/marketplaces/refurbed.png";
    if (slug === "back-market") return "/images/marketplaces/back-market.png";
    return null;
  };

  return (
    <div className="grid min-h-[400px] gap-0 divide-x divide-slate-200 md:grid-cols-[200px_1fr]">
      {/* ── Left nav ── */}
      <nav
        aria-label="Marketplace selection"
        className="space-y-1 p-4"
      >
        {(["refurbed", "back-market"] as const).map((slug) => {
          const mp = marketplaces.find((item) => item.slug === slug);
          if (!mp && slug === "back-market") return null;
          const label = slug === "refurbed" ? "Refurbed" : "Back Market";
          const logo = logoFor(slug);
          return (
            <button
              key={slug}
              type="button"
              onClick={() => setActiveSlug(slug)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                activeSlug === slug
                  ? "border-l-4 border-blue-600 bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                {logo ? (
                  <Image
                    src={logo}
                    alt={label}
                    width={20}
                    height={20}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  label.charAt(0)
                )}
              </span>
              {label}
            </button>
          );
        })}

        {otherMarketplaces.map((mp) => {
          const logo = logoFor(mp.slug);
          return (
            <button
              key={mp.id}
              type="button"
              disabled
              title="Listing management for this marketplace is not yet available."
              className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400 opacity-70"
            >
              {logo ? (
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                  <Image
                    src={logo}
                    alt={mp.name}
                    width={20}
                    height={20}
                    className="h-full w-full object-contain"
                  />
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                  {mp.name.charAt(0)}
                </span>
              )}
              {mp.name}
              <span className="ml-auto text-[10px] font-medium text-slate-400">
                Soon
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Right panel ── */}
      <div className="overflow-y-auto p-6">
        {activeSlug === "refurbed" && (
          <RefurbedPanel
            markets={markets}
            currency={currency}
            defaults={defaults}
            fieldErrors={fieldErrors}
          />
        )}
        {activeSlug === "back-market" && (
          <BackMarketPanel
            currency={currency}
            defaults={defaults}
            fieldErrors={fieldErrors}
          />
        )}
      </div>
    </div>
  );
}

function BackMarketPanel({
  currency,
  defaults,
  fieldErrors,
}: {
  currency: string;
  defaults?: MarketplaceListingDefaults;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <div className="space-y-1">
      <p className="mb-4 text-sm text-slate-500">
        Back Market listings use the product ID from the Back Market catalog,
        SKU, grade, quantity and price. Sync inventory after creating listings
        to pull live listing IDs from preprod/production.
      </p>
      <CheckboxRow
        label="Activate on marketplace"
        name="mp_backmarket_activate"
        defaultChecked={defaults?.activate ?? true}
      />
      <FieldRow label="EAN" hint="Optional product barcode.">
        <input
          name="mp_backmarket_ean"
          type="text"
          defaultValue={defaults?.ean ?? ""}
          className={inputClass}
        />
      </FieldRow>
      <MoneyFieldRow
        label="Top price"
        name="mp_backmarket_top_price"
        currency={currency}
        defaultValue={defaults?.top_price}
        error={fieldErrors?.["mp_backmarket_top_price"]}
      />
      <MoneyFieldRow
        label="Bottom price"
        name="mp_backmarket_bottom_price"
        currency={currency}
        defaultValue={defaults?.bottom_price}
      />
      <FieldRow
        label="Back Market product ID"
        hint="Required numeric product/backmarket ID from the Back Market catalog."
        required
      >
        <input
          name="mp_backmarket_product_id"
          type="text"
          defaultValue={defaults?.refurbed_id ?? ""}
          className={`${inputClass}${fieldErrors?.["mp_backmarket_product_id"] ? " border-red-500" : ""}`}
        />
        {fieldErrors?.["mp_backmarket_product_id"] && (
          <p className="mt-1 text-xs font-medium text-red-600">
            {fieldErrors["mp_backmarket_product_id"]}
          </p>
        )}
      </FieldRow>
    </div>
  );
}

/**
 * Copy prices / shipping / taxation between the main "Listing information"
 * fields and the "Listing information by marketplaces" panel.
 * Only fills empty targets so explicit overrides are preserved.
 */
export function syncListingAndMarketplaceFields(
  form: HTMLFormElement,
  direction: "main-to-panel" | "panel-to-main",
): void {
  const input = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;

  const mainTop = input("reference_price");
  const mainMin = input("reference_min_price");
  const mainShip = input("shipping_profile_id");
  const mainTax = input("taxation");
  const panelTop = input("mp_refurbed_top_price");
  const panelMin = input("mp_refurbed_bottom_price");
  const panelShip = input("mp_refurbed_shipping_profile_id");
  const panelTax = input("mp_refurbed_taxation");

  const fill = (
    target: HTMLInputElement | HTMLSelectElement | null,
    source: HTMLInputElement | HTMLSelectElement | null,
    force = false,
  ) => {
    if (!target || !source) return;
    if (!force && String(target.value ?? "").trim()) return;
    const next = String(source.value ?? "").trim();
    if (next) target.value = next;
  };

  if (direction === "main-to-panel") {
    fill(panelTop, mainTop);
    fill(panelMin, mainMin);
    fill(panelShip, mainShip);
    fill(panelTax, mainTax);
  } else {
    // Leaving marketplace view: panel Top/Bottom are authoritative.
    fill(mainTop, panelTop, true);
    fill(mainMin, panelMin, true);
    fill(mainShip, panelShip, true);
    fill(mainTax, panelTax, true);
  }
}

/** Effective top price from either listing view (panel overrides main when set). */
export function getEffectiveTopPrice(form: HTMLFormElement): {
  value: string;
  source: "panel" | "main" | "none";
} {
  const panel =
    (
      form.elements.namedItem("mp_refurbed_top_price") as HTMLInputElement | null
    )?.value.trim() ?? "";
  const main =
    (
      form.elements.namedItem("reference_price") as HTMLInputElement | null
    )?.value.trim() ?? "";

  if (panel !== "" && Number(panel) >= 0.01) {
    return { value: panel, source: "panel" };
  }
  if (main !== "" && Number(main) >= 0.01) {
    return { value: main, source: "main" };
  }
  return { value: "", source: "none" };
}

/**
 * Utility: extract MarketplaceListingPanel form values from a FormData
 * and return a structured object ready to merge into the offer payload.
 */
export function extractMarketplaceListingValues(
  form: FormData,
  markets: InventoryMarket[],
): {
  mp_refurbed: {
    activate: boolean;
    ean: string;
    top_price: string;
    bottom_price: string;
    block_price: boolean;
    battery_condition: string;
    taxation: string;
    warranty_delay: string;
    shipping_profile_id: string;
    refurbed_id: string;
    locales: Record<
      string,
      {
        price: string;
        min_price: string;
        block_price: boolean;
        dont_send_quantity: boolean;
        dont_send_price: boolean;
      }
    >;
  };
} {
  const str = (key: string) => String(form.get(key) ?? "");
  const bool = (key: string) => form.get(key) === "on";

  const locales: Record<
    string,
    {
      price: string;
      min_price: string;
      block_price: boolean;
      dont_send_quantity: boolean;
      dont_send_price: boolean;
    }
  > = {};

  for (const market of markets) {
    const p = `mp_locale_${market.code}_`;
    locales[market.code] = {
      price: str(`${p}price`),
      min_price: str(`${p}min_price`),
      block_price: bool(`${p}block_price`),
      dont_send_quantity: bool(`${p}dont_send_quantity`),
      dont_send_price: bool(`${p}dont_send_price`),
    };
  }

  return {
    mp_refurbed: {
      activate: bool("mp_refurbed_activate"),
      ean: str("mp_refurbed_ean"),
      top_price: str("mp_refurbed_top_price"),
      bottom_price: str("mp_refurbed_bottom_price"),
      block_price: bool("mp_refurbed_block_price"),
      battery_condition: str("mp_refurbed_battery_condition"),
      taxation: str("mp_refurbed_taxation"),
      warranty_delay: str("mp_refurbed_warranty_delay"),
      shipping_profile_id: str("mp_refurbed_shipping_profile_id"),
      refurbed_id: str("mp_refurbed_id"),
      locales,
    },
  };
}
