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
const TITLE_MAX = 500;
const DESCRIPTION_MAX = 1000;

export function InventoryEditPage({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<InventoryOfferDetails | null>(null);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [titleLength, setTitleLength] = useState(0);
  const [descriptionLength, setDescriptionLength] = useState(0);

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

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);

    const grading = ["A", "B", "C", "AA"].includes(offer.grading)
      ? offer.grading
      : "A";
    const referencePrice = String(
      offer.listing_details?.mp_refurbed_top_price ||
        offer.reference_price ||
        "",
    ).trim();

    const previousDetails = Object.fromEntries(
      Object.entries(offer.listing_details ?? {})
        .filter(([key, value]) => key !== "marketplace_prices" && value != null)
        .map(([key, value]) => [key, String(value)]),
    );

    const title = String(values.detail_title ?? "").trim();
    const description = String(values.detail_description ?? "").trim();
    const ean = String(values.detail_ean ?? "").trim();
    const referenceMinPrice =
      String(offer.reference_min_price || referencePrice).trim() || null;

    const mergedListingDetails: Record<string, string> = {
      ...previousDetails,
      title,
      description,
      ean,
      mp_refurbed_ean: ean,
      mp_refurbed_top_price: referencePrice,
      mp_refurbed_bottom_price: referenceMinPrice || "",
    };

    const codedMarkets = offer.markets.filter((market) =>
      (offer.market_codes ?? []).some(
        (code) =>
          String(code).toUpperCase() === String(market.code).toUpperCase(),
      ),
    );
    const submitOfferMarkets =
      codedMarkets.length > 0 ? codedMarkets : offer.markets;

    const marketPrices = submitOfferMarkets
      .map((market) => {
        const existingPrice = offer.market_prices?.find(
          (price) =>
            String(price.market_code).toUpperCase() ===
            String(market.code).toUpperCase(),
        );
        const price = referencePrice || existingPrice?.price || "";
        if (!price || Number(price) <= 0) return null;
        return {
          market_code: market.code,
          price,
          min_price: String(
            referenceMinPrice || existingPrice?.min_price || price,
          ),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const update: Record<string, unknown> = {
      grading,
      taxation: offer.taxation || "GROSS",
      stock: Number(values.stock),
      reference_price: referencePrice,
      listing_details: mergedListingDetails,
    };
    if (offer.shipping_profile_id) {
      update.shipping_profile_id = offer.shipping_profile_id;
    }
    if (referenceMinPrice) update.reference_min_price = referenceMinPrice;
    if (marketPrices.length > 0) update.market_prices = marketPrices;

    setSaving(true);
    setError("");
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
    offer.marketplace.slug === "back-market" ||
    offer.marketplace.slug?.startsWith("back-market")
      ? "/images/marketplaces/back-market.png"
      : "/images/marketplaces/refurbed.png";
  const offerMarkets = offer.markets.filter((market) =>
    offer.market_codes.includes(market.code),
  );
  const currency = offer.reference_currency_code || "EUR";
  const details = offer.listing_details ?? {};
  const initialTitle =
    details.title || offer.instance_name || "";
  const initialDescription = details.description || "";

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
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <h2 className="border-b border-slate-200 p-6 text-2xl font-bold text-slate-900">
            Listing information
          </h2>
          <Section title="Sell on the following marketplaces" open>
            <MarketplaceSelectorRow
              marketplaces={marketplaces}
              markets={offerMarkets}
              defaultEnabledSlug={offer.marketplace.slug}
            />
          </Section>
          <Section title="General information" open>
            <Field label="Title" className="md:col-span-2">
              <textarea
                name="detail_title"
                maxLength={TITLE_MAX}
                rows={2}
                defaultValue={initialTitle}
                onChange={(event) => setTitleLength(event.target.value.length)}
                onFocus={(event) => setTitleLength(event.target.value.length)}
                className={inputClass}
              />
              <p className="mt-1 text-xs font-normal text-slate-500">
                Remaining characters:{" "}
                {TITLE_MAX - (titleLength || initialTitle.length)}
              </p>
            </Field>
            <Field label="Condition" required>
              <select
                name="grading_display"
                disabled
                defaultValue={
                  ["AA", "A", "B", "C"].includes(offer.grading)
                    ? offer.grading
                    : "A"
                }
                className={`${readOnlyInputClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                }}
              >
                <option value="AA">Refurbished - Premium</option>
                <option value="A">Refurbished - Excellent</option>
                <option value="B">Refurbished - Good</option>
                <option value="C">Refurbished - Fair</option>
              </select>
            </Field>
            <Field label="SKU" required>
              <textarea
                name="sku_display"
                readOnly
                rows={2}
                defaultValue={offer.sku}
                className={readOnlyInputClass}
              />
            </Field>
            <Field label="EAN all marketplaces">
              <input
                name="detail_ean"
                defaultValue={
                  details.ean || details.mp_refurbed_ean || offer.ean || ""
                }
                className={inputClass}
              />
            </Field>
            <Field label="Quantity" required>
              <input
                name="stock"
                type="number"
                min="0"
                required
                defaultValue={offer.stock}
                className={inputClass}
              />
            </Field>
            <Field label="Offer description" className="md:col-span-2">
              <textarea
                name="detail_description"
                maxLength={DESCRIPTION_MAX}
                rows={4}
                defaultValue={initialDescription}
                onChange={(event) =>
                  setDescriptionLength(event.target.value.length)
                }
                onFocus={(event) =>
                  setDescriptionLength(event.target.value.length)
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs font-normal text-slate-500">
                Remaining characters:{" "}
                {DESCRIPTION_MAX -
                  (descriptionLength || initialDescription.length)}
              </p>
            </Field>
            <Field label="Top price" required>
              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
                <span className="grid place-items-center border-r border-slate-300 px-3 text-sm font-bold text-slate-500">
                  {currency}
                </span>
                <input
                  name="reference_price_display"
                  readOnly
                  value={
                    details.mp_refurbed_top_price || offer.reference_price || ""
                  }
                  className="min-w-0 flex-1 cursor-default bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </div>
            </Field>
          </Section>
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
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`block text-sm font-semibold text-slate-700 ${className}`.trim()}
    >
      <span>
        {required ? "* " : ""}
        {label}
      </span>
      {children}
    </label>
  );
}

