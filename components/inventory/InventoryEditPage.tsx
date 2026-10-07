"use client";

import {
  ArrowLeft,
  ChevronDown,
  CircleAlert,
  Package,
  RefreshCw,
  Store,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import { ShippingProfileSelect } from "@/components/inventory/ShippingProfileSelect";
import AppLink from "@/components/ui/AppLink";
import { ContentLoading } from "@/components/ui/ContentLoading";
import {
  getInventoryOffer,
  InventoryApiError,
  updateInventoryOffer,
} from "@/lib/api/inventory";
import type { InventoryOfferDetails } from "@/types/inventory";

const controlClass =
  "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition";
const inputClass = `${controlClass} bg-white text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500`;
const readOnlyInputClass = `${controlClass} cursor-default bg-slate-100 text-slate-500`;

export function InventoryEditPage({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<InventoryOfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [marketCode, setMarketCode] = useState("");

  useEffect(() => {
    let active = true;

    getInventoryOffer(offerId)
      .then((response) => {
        if (active) {
          setOffer(response.data.offer);
          setMarketCode(response.data.offer.market_codes[0] || "");
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

    const values = Object.fromEntries(new FormData(event.currentTarget));
    const update = {
      grading: String(values.grading),
      taxation: String(values.taxation),
      stock: Number(values.stock),
      shipping_profile_id: String(values.shipping_profile_id),
      reference_price: String(values.reference_price),
      reference_min_price: values.reference_min_price
        ? String(values.reference_min_price)
        : null,
      market_code: String(values.market_code),
    };

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateInventoryOffer(offer.id, update);
      setOffer({ ...offer, ...update });
      setMessage("Offer saved successfully.");
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
      ? "/images/marketplaces/back-market.jpg"
      : "/images/marketplaces/refurbed.png";
  const offerMarkets = offer.markets.filter((market) =>
    offer.market_codes.includes(market.code),
  );
  const activeMarket =
    offerMarkets.find((market) => market.code === marketCode) ??
    offerMarkets[0];
  const currency =
    activeMarket?.currency_code || offer.reference_currency_code || "EUR";

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
                  {activeMarket ? ` ${activeMarket.code}` : ""}
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
            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-blue-600" />
                <b>{offer.marketplace.name}</b>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Active
                </span>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Marketplace locale
                <select
                  name="market_code"
                  value={activeMarket?.code || ""}
                  onChange={(event) => setMarketCode(event.target.value)}
                  required
                  className={inputClass}
                >
                  {offerMarkets.map((market) => (
                    <option key={market.code} value={market.code}>
                      Refurbed {market.code} · {market.name}
                    </option>
                  ))}
                </select>
              </label>
              {offerMarkets.length === 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  Synchronize inventory to load this offer&apos;s marketplace
                  locales.
                </p>
              )}
            </div>
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
                defaultValue={offer.grading}
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
            <Field label="Shipping profile" required>
              <ShippingProfileSelect defaultValue={offer.shipping_profile_id} />
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
