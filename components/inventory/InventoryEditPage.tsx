"use client";

import {
  ArrowLeft,
  ChevronDown,
  CircleAlert,
  Package,
  RefreshCw,
} from "lucide-react";
import Image from "@/components/ui/AppImage";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import {
  MarketplaceListingPanel,
  extractMarketplaceListingValues,
  getEffectiveTopPrice,
  syncListingAndMarketplaceFields,
  type MarketplaceListingDefaults,
} from "@/components/inventory/MarketplaceListingPanel";
import { MarketplaceSelectorRow } from "@/components/inventory/MarketplaceSelectorRow";
import AppLink from "@/components/ui/AppLink";
import { ContentLoading } from "@/components/ui/ContentLoading";
import {
  getInventoryOffer,
  InventoryApiError,
  updateInventoryOffer,
} from "@/lib/api/inventory";
import { getMarketplaces } from "@/lib/api/marketplaces";
import type { InventoryOfferDetails } from "@/types/inventory";
import type { Marketplace } from "@/types/marketplace";

const controlClass =
  "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition";
const inputClass = `${controlClass} bg-white text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500`;
const readOnlyInputClass = `${controlClass} cursor-default bg-slate-100 text-slate-500`;

export function InventoryEditPage({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<InventoryOfferDetails | null>(null);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [marketplaceView, setMarketplaceView] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([getInventoryOffer(offerId), getMarketplaces()])
      .then(([offerResponse, mpResponse]) => {
        if (active) {
          setOffer(offerResponse.data.offer);
          setMarketplaces([
            ...mpResponse.data.connected,
            ...mpResponse.data.available,
          ]);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load this listing.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [offerId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offer) return;

    // Keep main listing money fields aligned with marketplace panel values.
    syncListingAndMarketplaceFields(event.currentTarget, "panel-to-main");

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);

    // ── Client-side validation ────────────────────────────────────────────
    // Shipping / top price may be set on either listing view.
    const clientErrors: Record<string, string> = {};
    const panelShipping = String(
      form.get("mp_refurbed_shipping_profile_id") ?? "",
    ).trim();
    const mainShipping = String(form.get("shipping_profile_id") ?? "").trim();
    if (!panelShipping && !mainShipping) {
      clientErrors["mp_refurbed_shipping_profile_id"] =
        "Please enter the Refurbed Shipping Profile Id.";
    }
    const topPrice = getEffectiveTopPrice(event.currentTarget);
    if (topPrice.source === "none") {
      clientErrors[
        marketplaceView ? "mp_refurbed_top_price" : "reference_price"
      ] = "Enter a top price of at least 0.01.";
    }
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      if (
        clientErrors["mp_refurbed_top_price"] ||
        clientErrors["mp_refurbed_shipping_profile_id"]
      ) {
        setMarketplaceView(true);
      } else {
        setMarketplaceView(false);
      }
      return;
    }

    // Prefer markets already on the offer; fall back to all enabled offer markets.
    const codedMarkets = offer.markets.filter((market) =>
      (offer.market_codes ?? []).some(
        (code) => String(code).toUpperCase() === String(market.code).toUpperCase(),
      ),
    );
    const submitOfferMarkets =
      codedMarkets.length > 0 ? codedMarkets : offer.markets;

    // Extract marketplace panel values
    const mpValues = extractMarketplaceListingValues(form, submitOfferMarkets);
    const refurbed = mpValues.mp_refurbed;

    // Panel top/bottom prices drive Refurbed reference + per-market prices.
    const referencePrice = String(
      refurbed.top_price || values.reference_price || offer.reference_price || "0",
    ).trim();
    const referenceMinPrice = refurbed.block_price
      ? referencePrice
      : String(
          refurbed.bottom_price ||
            values.reference_min_price ||
            offer.reference_min_price ||
            "",
        ).trim() || null;

    // Build listing_details with both ui-metadata keys and the backend-behaviour keys.
    // Keep only string values; drop marketplace_prices (backend rebuilds it).
    const previousDetails = Object.fromEntries(
      Object.entries(offer.listing_details ?? {})
        .filter(([key, value]) => key !== "marketplace_prices" && value != null)
        .map(([key, value]) => [key, String(value)]),
    );
    const grading = ["A", "B", "C", "AA"].includes(String(values.grading))
      ? String(values.grading)
      : offer.grading && ["A", "B", "C", "AA"].includes(offer.grading)
        ? offer.grading
        : "A";
    const taxation = ["GROSS", "MARGINAL"].includes(
      refurbed.taxation || String(values.taxation || ""),
    )
      ? refurbed.taxation || String(values.taxation)
      : offer.taxation || "GROSS";
    const shippingProfileId = (
      refurbed.shipping_profile_id ||
      String(values.shipping_profile_id || offer.shipping_profile_id || "")
    ).trim();

    const mergedListingDetails: Record<string, string> = {
      ...previousDetails,
      mp_refurbed_activate: refurbed.activate ? "1" : "0",
      mp_refurbed_ean: refurbed.ean,
      mp_refurbed_battery_condition: refurbed.battery_condition,
      mp_refurbed_id: refurbed.refurbed_id,
      mp_refurbed_top_price: referencePrice,
      mp_refurbed_bottom_price: referenceMinPrice || "",
      mp_refurbed_block_price: refurbed.block_price ? "1" : "0",
      mp_refurbed_taxation: taxation,
      mp_refurbed_shipping_profile_id: shippingProfileId,
      ...Object.fromEntries(
        detailSections.flatMap((section) =>
          section.fields.map(([key]) => [
            key,
            String(values["detail_" + key] ?? ""),
          ]),
        ),
      ),
    };

    for (const market of submitOfferMarkets) {
      const locale = refurbed.locales[market.code];
      mergedListingDetails[`dont_send_quantity_${market.code}`] =
        locale?.dont_send_quantity ? "1" : "0";
      // Keep sending prices unless the locale explicitly opts out.
      mergedListingDetails[`dont_send_price_${market.code}`] =
        locale?.dont_send_price ? "1" : "0";
      mergedListingDetails[`block_price_${market.code}`] =
        locale?.block_price || refurbed.block_price ? "1" : "0";
      // Persist locale prices only when they are true per-market overrides.
      // Seeding them from the panel top/bottom made later panel edits ignore
      // Top/Bottom and keep pushing the old locale values to Refurbed.
      const localePrice = String(locale?.price ?? "").trim();
      const localeMin = String(locale?.min_price ?? "").trim();
      mergedListingDetails[`mp_locale_${market.code}_price`] =
        localePrice && localePrice !== referencePrice ? localePrice : "";
      const panelMin = referenceMinPrice || referencePrice;
      mergedListingDetails[`mp_locale_${market.code}_min_price`] =
        localeMin && localeMin !== panelMin ? localeMin : "";
    }

    // Panel top/bottom drive Refurbed update_market_prices; locale fields
    // only win when they differ from the panel (explicit override).
    const marketPrices = submitOfferMarkets
      .map((market) => {
        const locale = refurbed.locales[market.code];
        const existingPrice = offer.market_prices?.find(
          (p) =>
            String(p.market_code).toUpperCase() ===
            String(market.code).toUpperCase(),
        );
        const localePrice = String(locale?.price ?? "").trim();
        const price = String(
          (localePrice && localePrice !== referencePrice
            ? localePrice
            : "") ||
            referencePrice ||
            existingPrice?.price ||
            "",
        ).trim();
        if (!price || Number(price) <= 0) return null;
        const localeMin = String(locale?.min_price ?? "").trim();
        const panelMin = referenceMinPrice || referencePrice;
        const rawMin =
          locale?.block_price || refurbed.block_price
            ? price
            : (localeMin && localeMin !== panelMin ? localeMin : "") ||
              panelMin ||
              existingPrice?.min_price ||
              price;
        const minPrice = String(rawMin || price).trim();
        return {
          market_code: market.code,
          price,
          min_price: minPrice,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const update: Record<string, unknown> = {
      grading,
      taxation,
      stock: Number(values.stock),
      reference_price: referencePrice,
      listing_details: mergedListingDetails,
    };
    if (shippingProfileId) update.shipping_profile_id = shippingProfileId;
    if (referenceMinPrice) update.reference_min_price = referenceMinPrice;
    if (marketPrices.length > 0) update.market_prices = marketPrices;

    setSaving(true);
    setError("");
    setFieldErrors({});
    setMessage("");

    try {
      const response = await updateInventoryOffer(offer.id, update);
      const saved = await getInventoryOffer(offer.id);
      setOffer(saved.data.offer);
      setMessage(response.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(
        caught instanceof InventoryApiError
          ? caught.message
          : "Unable to save this offer.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ContentLoading label="Loading listing" />;

  if (!offer) {
    return (
      <PageFrame>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <CircleAlert className="mb-3 h-6 w-6" />
          {error || "This listing could not be found."}
        </div>
      </PageFrame>
    );
  }

  const marketplaceLogo =
    offer.marketplace.slug === "back-market"
      ? "/images/marketplaces/back-market.png"
      : "/images/marketplaces/refurbed.png";
  const offerMarkets = offer.markets.filter((market) =>
    offer.market_codes.includes(market.code),
  );
  const currency = offer.reference_currency_code || "EUR";

  return (
    <PageFrame>
      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-4">
          <AppLink
            href="/dashboard/inventory"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Inventory / Change details
          </AppLink>
          <AppLink
            href="/dashboard/inventory"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to inventory
          </AppLink>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Modify this listing
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Update the Refurbed offer information.
        </p>
      </div>

      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.72fr)_minmax(620px,1fr)]">
        <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Product and Marketplace Information
            </h2>
            <RefreshCw className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white p-2">
                <Image
                  src={marketplaceLogo}
                  alt={offer.marketplace.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  On {offer.marketplace.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Connected marketplace
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex gap-3">
                <Package className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-bold text-slate-900">
                    {offer.instance_name}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    SKU: {offer.sku}
                  </p>
                  <p className="text-sm text-slate-500">
                    Instance ID: {offer.instance_id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <form
          onSubmit={submit}
          onInvalidCapture={() => setMarketplaceView(false)}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <h2 className="border-b border-slate-200 p-6 text-2xl font-bold text-slate-900">
            {marketplaceView
              ? "Listing information by marketplaces"
              : "Listing information"}
          </h2>
          <div hidden={marketplaceView}>
            <Section title="Sell on the following marketplaces" open>
              <MarketplaceSelectorRow
                marketplaces={marketplaces}
                markets={offerMarkets}
                defaultEnabledSlug={offer.marketplace.slug}
              />
            </Section>
            <Section title="Product information" open>
              <ReadOnlyField
                label="Product instance name"
                value={offer.instance_name}
              />
              <ReadOnlyField label="Instance ID" value={offer.instance_id} />
              <ReadOnlyField label="SKU" value={offer.sku} />
              <Field label="Grade" required>
                <select
                  name="grading"
                  required
                  defaultValue={
                    ["AA", "A", "B", "C"].includes(offer.grading)
                      ? offer.grading
                      : "A"
                  }
                  className={inputClass}
                >
                  <option value="AA">Premium</option>
                  <option value="A">Very Good</option>
                  <option value="B">Good</option>
                  <option value="C">Acceptable</option>
                </select>
              </Field>
              <ReadOnlyField
                label="Warranty"
                value={offer.warranty === "M12" ? "12 Months" : offer.warranty}
              />
              <Field label="Stock" required>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  required
                  defaultValue={offer.stock}
                  className={inputClass}
                />
              </Field>
            </Section>
            <Section title="Pricing" open>
              <Field label="Taxation" required>
                <select
                  name="taxation"
                  required
                  defaultValue={offer.taxation || "GROSS"}
                  className={inputClass}
                >
                  <option value="GROSS">Gross taxation</option>
                  <option value="MARGINAL">Marginal taxation</option>
                </select>
              </Field>
              <ReadOnlyField label="Reference currency" value={currency} />
              <Field label="Minimum reference price">
                <MoneyInput
                  name="reference_min_price"
                  defaultValue={offer.reference_min_price || ""}
                  currency={currency}
                />
              </Field>
              <Field label="Reference price" required>
                <MoneyInput
                  name="reference_price"
                  defaultValue={offer.reference_price}
                  currency={currency}
                  required
                />
                {fieldErrors.reference_price && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {fieldErrors.reference_price}
                  </p>
                )}
              </Field>
            </Section>
            <p className="px-6 py-4 text-sm text-slate-500">
              Supplementary listing, logistics and GPSR details are saved in
              CelleXa. Grade, taxation, stock, shipping profile and prices are
              synchronized with Refurbed.
            </p>
            {detailSections.map((section) => (
              <Section key={section.title} title={section.title}>
                {section.fields.map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      name={"detail_" + key}
                      defaultValue={
                        offer.listing_details?.[key] ||
                        (key === "title" ? offer.instance_name : "")
                      }
                      maxLength={2000}
                      className={inputClass}
                    />
                  </Field>
                ))}
              </Section>
            ))}
          </div>
          <div hidden={!marketplaceView}>
            {(() => {
              // Build defaults from the existing offer's listing_details
              const ld = offer.listing_details ?? {};
              const panelDefaults: MarketplaceListingDefaults = {
                activate: ld.mp_refurbed_activate !== "0",
                ean: ld.mp_refurbed_ean ?? offer.ean ?? "",
                top_price: ld.mp_refurbed_top_price || offer.reference_price || "",
                bottom_price:
                  ld.mp_refurbed_bottom_price || offer.reference_min_price || "",
                block_price: ld.mp_refurbed_block_price === "1",
                battery_condition: ld.mp_refurbed_battery_condition ?? "OPTIMAL",
                taxation: ld.mp_refurbed_taxation ?? offer.taxation ?? "GROSS",
                warranty_delay: ld.mp_refurbed_warranty_delay ?? "12",
                shipping_profile_id:
                  ld.mp_refurbed_shipping_profile_id ?? offer.shipping_profile_id ?? "",
                refurbed_id: ld.mp_refurbed_id ?? "",
                locales: Object.fromEntries(
                  offerMarkets.map((market) => {
                    const panelTop =
                      ld.mp_refurbed_top_price || offer.reference_price || "";
                    const panelBottom =
                      ld.mp_refurbed_bottom_price ||
                      offer.reference_min_price ||
                      panelTop;
                    const storedPrice = String(
                      ld[`mp_locale_${market.code}_price`] ?? "",
                    ).trim();
                    const storedMin = String(
                      ld[`mp_locale_${market.code}_min_price`] ?? "",
                    ).trim();
                    // Only surface locale fields when they are real overrides.
                    // Previously we also fell back to offer.market_prices, which
                    // pre-filled every locale and blocked panel Top/Bottom updates.
                    return [
                      market.code,
                      {
                        price:
                          storedPrice && storedPrice !== panelTop
                            ? storedPrice
                            : "",
                        min_price:
                          storedMin && storedMin !== panelBottom
                            ? storedMin
                            : "",
                        block_price:
                          ld[`mp_locale_${market.code}_block_price`] === "1" ||
                          ld[`block_price_${market.code}`] === "1",
                        dont_send_quantity:
                          ld[`mp_locale_${market.code}_dont_send_quantity`] === "1" ||
                          ld[`dont_send_quantity_${market.code}`] === "1",
                        dont_send_price:
                          ld[`mp_locale_${market.code}_dont_send_price`] === "1" ||
                          ld[`dont_send_price_${market.code}`] === "1",
                      },
                    ];
                  }),
                ),
              };
              return (
                <MarketplaceListingPanel
                  markets={offerMarkets}
                  marketplaces={marketplaces}
                  currency={currency}
                  defaults={panelDefaults}
                  fieldErrors={fieldErrors}
                />
              );
            })()}
          </div>
          <div className="flex justify-end px-6 py-4">
            <button
              type="button"
              onClick={(event) => {
                // Going forward → validate the main listing view first
                if (!marketplaceView) {
                  const form = event.currentTarget.closest("form");
                  if (form) {
                    const mainErrors: Record<string, string> = {};

                    const controls = Array.from(form.elements).filter(
                      (el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
                        el instanceof HTMLInputElement ||
                        el instanceof HTMLSelectElement ||
                        el instanceof HTMLTextAreaElement,
                    );
                    for (const control of controls) {
                      if (!control.willValidate) continue;
                      if (!control.validity.valid) {
                        mainErrors[control.name] =
                          control.validity.valueMissing
                            ? "This field is required."
                            : control.validationMessage;
                        control.setAttribute("aria-invalid", "true");
                      }
                    }

                    // Reference price: check effective top price
                    const topPrice = getEffectiveTopPrice(form);
                    if (topPrice.source === "none") {
                      mainErrors["reference_price"] = "Enter a top price of at least 0.01.";
                    }

                    if (Object.keys(mainErrors).length > 0) {
                      setFieldErrors(mainErrors);
                      const firstInvalid = controls.find((c) => mainErrors[c.name]);
                      if (firstInvalid) {
                        for (let p = firstInvalid.parentElement; p; p = p.parentElement) {
                          if (p instanceof HTMLDetailsElement) p.open = true;
                        }
                        firstInvalid.focus();
                        firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
                      }
                      return;
                    }
                  }
                }

                const form = event.currentTarget.closest("form");
                if (form) {
                  syncListingAndMarketplaceFields(
                    form,
                    marketplaceView ? "panel-to-main" : "main-to-panel",
                  );
                }
                setMarketplaceView((current) => !current);
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.reference_price;
                  delete next.mp_refurbed_top_price;
                  return next;
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="font-semibold text-blue-600 hover:underline"
            >
              {marketplaceView
                ? "Back to default listing information"
                : "Listing information by marketplaces ?"}
            </button>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => router.push("/dashboard/inventory")}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving changes..." : "Validate"}
            </button>
          </div>
        </form>
      </div>
    </PageFrame>
  );
}

const detailSections = [
  {
    title: "General information",
    fields: [
      ["title", "Title"],
      ["description", "Offer description"],
      ["item_cost", "Item cost"],
      ["smart_chain_id", "Smart Chain ID"],
      ["offer_tag", "Offer tag"],
      ["vat_rate", "VAT rate (%)"],
      ["category", "Category"],
      ["subcategory", "Subcategory"],
      ["custom_field", "Custom field"],
    ],
  },
  {
    title: "Logistics information",
    fields: [
      ["shipment_country", "Shipment country"],
      ["location", "Location"],
      ["logistic_weight", "Logistic weight (kg)"],
    ],
  },
  {
    title: "Product dimensions",
    fields: [
      ["product_weight", "Product weight (kg)"],
      ["product_width", "Product width (cm)"],
      ["product_length", "Product length (cm)"],
      ["product_height", "Product height (cm)"],
    ],
  },
  {
    title: "General Product Safety Regulation (GPSR)",
    fields: [
      ["gpsr_name", "Name"],
      ["gpsr_address", "Address"],
      ["gpsr_address_details", "Address details"],
      ["gpsr_city", "City"],
      ["gpsr_region", "Region"],
      ["gpsr_country", "Country"],
      ["gpsr_zip", "Zip code"],
      ["gpsr_phone", "Telephone number"],
      ["gpsr_email", "Email address"],
      ["gpsr_safety_url", "Product safety warning URL"],
      ["gpsr_european_manufacturer", "European manufacturer"],
    ],
  },
];

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">{children}</div>
    </main>
  );
}

function Section({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group border-b border-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 font-bold text-slate-900 transition hover:bg-slate-50">
        {title}
        <ChevronDown className="h-5 w-5 text-slate-500 transition group-open:rotate-180" />
      </summary>
      <div className="grid gap-x-6 gap-y-5 px-6 pb-7 md:grid-cols-2">
        {children}
      </div>
    </details>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span>
        {required ? "* " : ""}
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <input value={value || ""} readOnly className={readOnlyInputClass} />
    </Field>
  );
}

function MoneyInput({
  name,
  defaultValue,
  currency,
  required = false,
}: {
  name: string;
  defaultValue: string;
  currency: string;
  required?: boolean;
}) {
  return (
    <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
      <span className="grid place-items-center border-r border-slate-300 px-3 text-sm font-bold text-slate-500">
        {currency}
      </span>
      <input
        name={name}
        type="number"
        min="0"
        step="0.01"
        required={required}
        defaultValue={defaultValue}
        className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
      />
    </div>
  );
}
