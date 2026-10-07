"use client";

import {
  ChevronDown,
  FolderSearch,
  Package,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import { InventoryShell } from "@/components/inventory/InventoryTablePage";
import { ShippingProfileSelect } from "@/components/inventory/ShippingProfileSelect";
import {
  createInventoryOffer,
  getInventory,
  InventoryApiError,
} from "@/lib/api/inventory";
import {
  getRefurbedCatalog,
  searchRefurbedCatalog,
  type RefurbedCatalogItem,
} from "@/lib/api/refurbed-catalog";
import type { InventoryInstance, InventoryMarket } from "@/types/inventory";

const controlClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100";

const listingDetailFields = [
  "title",
  "description",
  "condition_label",
  "item_cost",
  "asin",
  "smart_chain_id",
  "offer_tag",
  "vat_rate",
  "category",
  "subcategory",
  "custom_field",
  "shipment_country",
  "location",
  "logistic_weight",
  "product_weight",
  "product_width",
  "product_length",
  "product_height",
  "gpsr_name",
  "gpsr_address",
  "gpsr_address_details",
  "gpsr_city",
  "gpsr_region",
  "gpsr_country",
  "gpsr_zip",
  "gpsr_phone",
  "gpsr_email",
  "gpsr_safety_url",
  "gpsr_european_manufacturer",
];

export function AddInventoryItemPage() {
  const router = useRouter();
  const [catalogSearch, setCatalogSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [catalogCount, setCatalogCount] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogLastPage, setCatalogLastPage] = useState(1);
  const [catalogResultCount, setCatalogResultCount] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [instance, setInstance] = useState<InventoryInstance | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [results, setResults] = useState<RefurbedCatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [markets, setMarkets] = useState<InventoryMarket[]>([]);

  useEffect(() => {
    Promise.all([getInventory({ limit: 1 }), getRefurbedCatalog()])
      .then(([inventoryResponse, catalogResponse]) => {
        setMarkets(inventoryResponse.data.markets);
        setCategories(catalogResponse.data.categories);
        setCatalogCount(catalogResponse.data.items_count);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load offer markets.",
        ),
      );
  }, []);

  useEffect(() => {
    if (!catalogSearch.trim() && !category) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setCatalogLoading(true);
      setError("");

      searchRefurbedCatalog({
        search: catalogSearch.trim() || undefined,
        category: category || undefined,
        page: catalogPage,
        limit: 25,
      })
        .then((response) => {
          if (!active) return;
          setResults(response.data.items);
          setCatalogPage(response.data.pagination.current_page);
          setCatalogLastPage(response.data.pagination.last_page);
          setCatalogResultCount(response.data.pagination.total);
        })
        .catch((caught) => {
          if (active) {
            setError(
              caught instanceof Error ? caught.message : "Search failed.",
            );
          }
        })
        .finally(() => {
          if (active) setCatalogLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [catalogSearch, category, catalogPage]);

  function selectCatalogItem(item: RefurbedCatalogItem) {
    setInstance({
      id: item.instance_id,
      name: item.name || item.name_de || `Instance ${item.instance_id}`,
      name_de: item.name_de || undefined,
      category: item.main_category || undefined,
      attributes: item.attributes || undefined,
      attributes_de: item.attributes_de || undefined,
    });
    setManualEntry(false);
    setResults([]);
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const condition = String(values.condition_label);
      const listingDetails = Object.fromEntries(
        listingDetailFields.map((field) => [
          field,
          String(values[field] ?? "").trim(),
        ]),
      );
      const payload: Record<string, unknown> = {
        sku: values.sku,
        grading: conditionGrade[condition] || "A",
        taxation: String(values.taxation || "GROSS"),
        warranty: "M12",
        stock: Number(values.stock),
        shipping_profile_id: values.shipping_profile_id,
        reference_currency_code: values.currency,
        reference_price: values.reference_price,
        reference_min_price: values.reference_min_price
          ? String(values.reference_min_price)
          : null,
        market_code: values.market_code,
        listing_details: listingDetails,
      };
      if (instance?.id) payload.instance_id = instance.id;
      else payload.gtin = values.gtin;
      const response = await createInventoryOffer(payload);
      setNotice(response.message);
      setTimeout(() => router.push("/dashboard/inventory"), 800);
    } catch (caught) {
      setError(
        caught instanceof InventoryApiError
          ? caught.message
          : "Unable to create listing.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (instance || manualEntry)
    return (
      <Listing
        instance={instance}
        manual={manualEntry}
        busy={busy}
        notice={notice}
        error={error}
        markets={markets}
        cancel={() => {
          setInstance(null);
          setManualEntry(false);
          setError("");
        }}
        submit={createListing}
      />
    );
  return (
    <InventoryShell
      title="Find the item you want to sell"
      subtitle="Search the Refurbed catalog before creating your listing."
    >
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert>{notice}</Alert>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
                  <FolderSearch className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Choose a product from the Refurbed catalog
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {catalogCount.toLocaleString()} products available
                  </p>
                </div>
              </div>
            </div>
            {catalogCount === 0 && (
              <Link
                href="/dashboard/settings/refurbed-catalog"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Import the Refurbed catalog
              </Link>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
            <label>
              <span className="sr-only">Filter by category</span>
              <select
                value={category}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategory(value);
                  setCatalogPage(1);
                  if (!value && !catalogSearch.trim()) {
                    setResults([]);
                    setCatalogResultCount(0);
                    setCatalogLastPage(1);
                  }
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative block">
              <span className="sr-only">Search the catalog</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={catalogSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setCatalogSearch(value);
                  setCatalogPage(1);
                  if (!value.trim() && !category) {
                    setResults([]);
                    setCatalogResultCount(0);
                    setCatalogLastPage(1);
                  }
                }}
                placeholder="Search by product name or instance ID"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>

        <div className="p-6">
          {catalogLoading && (
            <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Loading catalog products...
            </div>
          )}

          {!catalogLoading &&
            results.length === 0 &&
            !catalogSearch.trim() &&
            !category && (
              <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center">
                <FolderSearch className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-800">
                  Select a category or search the catalog
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Products will load based on your selection.
                </p>
              </div>
            )}

          {!catalogLoading &&
            results.length === 0 &&
            (catalogSearch.trim() || category) && (
              <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-800">
                  No matching products found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try a different search or category.
                </p>
              </div>
            )}

          {!catalogLoading && results.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Instance ID</th>
                      <th className="px-4 py-3 font-semibold">Product name</th>
                      <th className="px-4 py-3 font-semibold">Name DE</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Attributes</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {results.map((item) => (
                      <tr
                        key={item.instance_id}
                        className="hover:bg-blue-50/40"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-blue-600">
                          {item.instance_id}
                        </td>
                        <td className="max-w-xs px-4 py-4 font-medium text-slate-900">
                          {item.name || "—"}
                        </td>
                        <td className="max-w-xs px-4 py-4 text-slate-600">
                          {item.name_de || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {item.main_category || "Uncategorized"}
                        </td>
                        <td className="max-w-sm px-4 py-4 text-slate-500">
                          <span className="line-clamp-2">
                            {item.attributes || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => selectCatalogItem(item)}
                            className="rounded-lg border border-blue-500 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!catalogLoading && results.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                {catalogResultCount.toLocaleString()} matching products · Page{" "}
                {catalogPage} of {catalogLastPage}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={catalogPage <= 1}
                  onClick={() => setCatalogPage((current) => current - 1)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={catalogPage >= catalogLastPage}
                  onClick={() => setCatalogPage((current) => current + 1)}
                  className="rounded-xl border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </InventoryShell>
  );
}

function Listing({
  instance,
  manual,
  busy,
  notice,
  error,
  markets,
  cancel,
  submit,
}: {
  instance: InventoryInstance | null;
  manual: boolean;
  busy: boolean;
  notice: string;
  error: string;
  markets: InventoryMarket[];
  cancel: () => void;
  submit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [marketCode, setMarketCode] = useState(markets[0]?.code ?? "");
  const selectedMarket =
    markets.find((market) => market.code === marketCode) ?? markets[0];
  const [selectedCurrency, setSelectedCurrency] = useState(
    selectedMarket?.currency_code || "EUR",
  );
  const currency = marketCode
    ? selectedCurrency
    : selectedMarket?.currency_code || "EUR";

  return (
    <InventoryShell
      title="Add this listing"
      subtitle="Complete the product and marketplace information."
    >
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert>{notice}</Alert>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.72fr)_minmax(620px,1fr)]">
        <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Product and Marketplace Information
            </h2>
            <RefreshCw className="h-5 w-5 text-blue-600" />
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white p-2">
                <Image
                  src="/images/marketplaces/refurbed.png"
                  alt="Refurbed"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </span>
              <div>
                <b className="text-slate-900">
                  On Refurbed{selectedMarket ? ` ${selectedMarket.code}` : ""}
                </b>
                <p className="mt-1 text-sm text-slate-500">
                  {instance?.name || "New catalog entry"}
                </p>
              </div>
            </div>
            {manual && (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                The GTIN must already be recognized by Refurbed before an offer
                can be created.
              </p>
            )}
          </div>
        </aside>
        <form
          onSubmit={(e) => void submit(e)}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <h2 className="border-b border-slate-200 p-6 text-2xl font-bold text-slate-900">
            Listing information
          </h2>
          <Section title="Sell on the following marketplaces" open>
            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-blue-600" />
                <b>Refurbed</b>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Connected
                </span>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Store this offer in
                <select
                  name="market_code"
                  required
                  value={selectedMarket?.code || ""}
                  onChange={(event) => {
                    const code = event.target.value;
                    const selected = markets.find(
                      (market) => market.code === code,
                    );
                    setMarketCode(code);
                    setSelectedCurrency(selected?.currency_code || "EUR");
                  }}
                  className={controlClass}
                >
                  <option value="" disabled>
                    Select a marketplace locale
                  </option>
                  {markets.map((market) => (
                    <option key={market.code} value={market.code}>
                      Refurbed {market.code} · {market.name}
                    </option>
                  ))}
                </select>
              </label>
              {markets.length === 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  Enable at least one Refurbed market for offer management in
                  the marketplace connection settings.
                </p>
              )}
            </div>
          </Section>
          {instance && (
            <>
              <Section title="Product information" open>
                <Input
                  name="instance_name"
                  label="Product instance name"
                  defaultValue={instance.name}
                  readOnly
                />
                <Input
                  name="instance_id_display"
                  label="Instance ID"
                  defaultValue={instance.id}
                  readOnly
                />
                {instance.category && (
                  <Input
                    name="instance_category"
                    label="Main category"
                    defaultValue={instance.category}
                    readOnly
                  />
                )}
                {instance.name_de && (
                  <Input
                    name="instance_name_de"
                    label="Product name (German)"
                    defaultValue={instance.name_de}
                    readOnly
                  />
                )}
                {instance.attributes && (
                  <Field label="Attributes">
                    <textarea
                      readOnly
                      value={instance.attributes}
                      className={`${controlClass} read-only:bg-slate-100 read-only:text-slate-600`}
                      rows={3}
                    />
                  </Field>
                )}
                <Input name="sku" label="SKU" required />
                <GradeSelect />
                <Input
                  name="warranty_display"
                  label="Warranty"
                  defaultValue="12 Months"
                  readOnly
                />
                <Input name="stock" label="Stock" type="number" required />
                <Field label="Shipping profile" required>
                  <ShippingProfileSelect />
                </Field>
              </Section>
              <Section title="Pricing" open>
                <label className="text-sm font-semibold text-slate-700">
                  * Taxation
                  <select
                    name="taxation"
                    required
                    defaultValue="GROSS"
                    className={controlClass}
                  >
                    <option value="GROSS">Gross taxation</option>
                    <option value="MARGINAL">Marginal taxation</option>
                  </select>
                </label>
                <Select
                  name="currency"
                  label="Reference currency"
                  values={["EUR", "CHF", "GBP"]}
                  value={currency}
                  change={setSelectedCurrency}
                  required
                />
                <Field label="Minimum reference price">
                  <MoneyInput name="reference_min_price" currency={currency} />
                </Field>
                <Field label="Reference price" required>
                  <MoneyInput
                    name="reference_price"
                    currency={currency}
                    required
                  />
                </Field>
              </Section>
            </>
          )}
          {manual && (
            <Section title="General information" open>
              <Field label="Title">
                <textarea
                  name="title"
                  maxLength={500}
                  defaultValue={instance?.name}
                  readOnly={Boolean(instance)}
                  className={`${controlClass} read-only:bg-slate-100 read-only:text-slate-500`}
                  rows={2}
                />
              </Field>
              {manual && (
                <Field label="Item cost">
                  <MoneyInput name="item_cost" currency={currency} />
                </Field>
              )}
              <ConditionSelect />
              <Input name="sku" label="SKU" required />
              <Input
                name="gtin"
                label="EAN all marketplaces"
                defaultValue={instance?.gtin}
                required={manual}
                disabled={!manual}
              />
              {manual && <Input name="asin" label="ASIN all Amazon" />}
              <Input name="stock" label="Quantity" type="number" required />
              {manual && (
                <Field label="Offer description">
                  <textarea
                    name="description"
                    maxLength={1000}
                    className={controlClass}
                    rows={3}
                  />
                </Field>
              )}
              <Field label="Top price" required>
                <MoneyInput
                  name="reference_price"
                  currency={currency}
                  required
                />
              </Field>
              {manual && (
                <>
                  <Field label="Minimum price">
                    <MoneyInput
                      name="reference_min_price"
                      currency={currency}
                    />
                  </Field>
                  <Input name="smart_chain_id" label="Smart Chain (Chain id)" />
                  <Input name="offer_tag" label="Offer tag" />
                  <Field label="VAT rate">
                    <UnitInput name="vat_rate" unit="%" />
                  </Field>
                  <Input name="category" label="Category" />
                  <Input name="subcategory" label="Subcategory" />
                  <Field label="Custom field">
                    <textarea
                      name="custom_field"
                      maxLength={500}
                      className={controlClass}
                      rows={2}
                    />
                  </Field>
                </>
              )}
              <Field label="Shipping profile" required>
                <ShippingProfileSelect />
              </Field>
              <Select
                name="currency"
                label="Currency"
                values={["EUR", "CHF", "GBP"]}
                value={currency}
                change={setSelectedCurrency}
              />
            </Section>
          )}
          {manual && (
            <Section title="Logistics information">
              <Field label="Shipment country">
                <CountrySelect name="shipment_country" />
              </Field>
              <Input name="location" label="Location" />
              <Field label="Logistic weight">
                <UnitInput name="logistic_weight" unit="kg" />
              </Field>
            </Section>
          )}
          {manual && (
            <Section title="Product dimensions">
              <Field label="Product weight">
                <UnitInput name="product_weight" unit="kg" />
              </Field>
              <Field label="Product width">
                <UnitInput name="product_width" unit="cm" />
              </Field>
              <Field label="Product length">
                <UnitInput name="product_length" unit="cm" />
              </Field>
              <Field label="Product height">
                <UnitInput name="product_height" unit="cm" />
              </Field>
            </Section>
          )}
          {manual && (
            <Section title="General Product Safety Regulation (GPSR)">
              <Input name="gpsr_name" label="Name" />
              <Input name="gpsr_address" label="Address" />
              <Field label="Address details">
                <textarea
                  name="gpsr_address_details"
                  className={controlClass}
                  rows={2}
                />
              </Field>
              <Input name="gpsr_city" label="City" />
              <Input name="gpsr_region" label="Region" />
              <Field label="Country">
                <CountrySelect name="gpsr_country" />
              </Field>
              <Input name="gpsr_zip" label="Zip code" />
              <Input name="gpsr_phone" label="Telephone number" type="tel" />
              <Input name="gpsr_email" label="Email address" type="email" />
              <Input
                name="gpsr_safety_url"
                label="Product safety warning URL"
                type="url"
              />
              <Select
                name="gpsr_european_manufacturer"
                label="European manufacturer"
                values={["", "yes", "no"]}
              />
            </Section>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancel}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Validate"}
            </button>
          </div>
        </form>
      </div>
    </InventoryShell>
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
function Input({
  name,
  label,
  type = "text",
  step,
  required = false,
  disabled = false,
  readOnly = false,
  defaultValue,
  value,
  change,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: string;
  value?: string;
  change?: (v: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      {required && "* "}
      {label}
      <input
        name={name}
        type={type}
        step={step}
        min={type === "number" ? 0 : undefined}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={change ? (e) => change(e.target.value) : undefined}
        className={`${controlClass} read-only:bg-slate-100 read-only:text-slate-500`}
      />
    </label>
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

function MoneyInput({
  name,
  currency,
  required = false,
}: {
  name: string;
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
        className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
      />
    </div>
  );
}

function UnitInput({ name, unit }: { name: string; unit: string }) {
  return (
    <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
      <input
        name={name}
        type="number"
        min="0"
        step="0.01"
        className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
      />
      <span className="grid place-items-center border-l border-slate-300 px-3 text-sm font-bold text-slate-500">
        {unit}
      </span>
    </div>
  );
}

const countryCodes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = countryCodes
  .map((code) => ({ code, name: countryNames.of(code) || code }))
  .sort((left, right) => left.name.localeCompare(right.name));

function CountrySelect({ name }: { name: string }) {
  return (
    <select name={name} defaultValue="" className={controlClass}>
      <option value="">Select a country</option>
      {countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name} ({country.code})
        </option>
      ))}
    </select>
  );
}

function Select({
  name,
  label,
  values,
  value,
  change,
  required = false,
}: {
  name: string;
  label: string;
  values: string[];
  value?: string;
  change?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        name={name}
        required={required}
        className={controlClass}
        value={value}
        onChange={change ? (event) => change(event.target.value) : undefined}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {v || "Nothing selected"}
          </option>
        ))}
      </select>
    </label>
  );
}
const conditions = [
  "New",
  "Used - Like New",
  "Used - Very Good",
  "Used - Good",
  "Acceptable",
  "Refurbished - Premium",
  "Refurbished - New",
  "Refurbished - Like New",
  "Refurbished - Very Good",
  "Refurbished - Good",
  "Refurbished - Acceptable",
  "Collectible - Like New",
  "Collectible - Very Good",
  "Collectible - Good",
  "Collectible - Acceptable",
];
const conditionGrade: Record<string, string> = {
  New: "AA",
  "Used - Like New": "AA",
  "Used - Very Good": "A",
  "Used - Good": "B",
  Acceptable: "C",
  "Refurbished - Premium": "AA",
  "Refurbished - New": "AA",
  "Refurbished - Like New": "AA",
  "Refurbished - Very Good": "A",
  "Refurbished - Good": "B",
  "Refurbished - Acceptable": "C",
  "Collectible - Like New": "AA",
  "Collectible - Very Good": "A",
  "Collectible - Good": "B",
  "Collectible - Acceptable": "C",
};
function GradeSelect() {
  return (
    <label className="text-sm font-semibold text-slate-700">
      * Grade
      <select
        name="condition_label"
        required
        defaultValue=""
        className={controlClass}
      >
        <option value="" disabled>
          Select grade
        </option>
        <option value="Refurbished - Premium">Premium</option>
        <option value="Refurbished - Very Good">Very Good</option>
        <option value="Refurbished - Good">Good</option>
        <option value="Refurbished - Acceptable">Acceptable</option>
      </select>
    </label>
  );
}
function ConditionSelect() {
  return (
    <label className="text-sm font-semibold text-slate-700">
      * Condition
      <select
        name="condition_label"
        required
        defaultValue=""
        className={controlClass}
      >
        <option value="" disabled>
          - Select one -
        </option>
        {conditions.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}
function Alert({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "info" | "error";
}) {
  return (
    <p
      className={`mb-5 rounded-xl border p-4 text-sm font-semibold ${kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}
    >
      {children}
    </p>
  );
}
