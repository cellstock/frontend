"use client";

import {
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ScanBarcode,
  Type,
} from "lucide-react";
import Image from "@/components/ui/AppImage";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  MarketplaceListingPanel,
  extractMarketplaceListingValues,
} from "@/components/inventory/MarketplaceListingPanel";
import { MarketplaceSelectorRow } from "@/components/inventory/MarketplaceSelectorRow";

import { InventoryShell } from "@/components/inventory/InventoryTablePage";
import { ShippingProfileSelect } from "@/components/inventory/ShippingProfileSelect";
import {
  createInventoryOffer,
  findInventoryInstance,
  getInventory,
} from "@/lib/api/inventory";
import {
  getRefurbedCatalog,
  searchRefurbedCatalog,
  type RefurbedCatalogItem,
} from "@/lib/api/refurbed-catalog";
import { getMarketplaces } from "@/lib/api/marketplaces";
import type { Marketplace } from "@/types/marketplace";
import type { InventoryInstance, InventoryMarket } from "@/types/inventory";

const ValidationContext = createContext<Record<string, string>>({});
function FieldError({ name }: { name: string }) {
  const errors = useContext(ValidationContext);
  return errors[name] ? (
    <span
      id={"error-" + name}
      role="alert"
      className="mt-1 block text-xs font-medium text-red-600"
    >
      <b className="mr-1 rounded bg-red-600 px-1 text-white">ERROR</b>
      {errors[name]}
    </span>
  ) : null;
}

const controlClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100";

export function AddInventoryItemPage() {
  const router = useRouter();

  // ── shared state loaded once on mount ───────────────────────────────────
  const [categories, setCategories] = useState<string[]>([]);
  const [markets, setMarkets] = useState<InventoryMarket[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [initError, setInitError] = useState("");

  useEffect(() => {
    Promise.all([
      getInventory({ limit: 1 }),
      getRefurbedCatalog(),
      getMarketplaces(),
    ])
      .then(([inventoryResponse, catalogResponse, marketplaceResponse]) => {
        setMarketplaces([
          ...marketplaceResponse.data.connected,
          ...marketplaceResponse.data.available,
        ]);
        setMarkets(inventoryResponse.data.markets);
        setCategories(catalogResponse.data.categories);
      })
      .catch((caught) =>
        setInitError(
          caught instanceof Error
            ? caught.message
            : "Unable to load marketplace data.",
        ),
      );
  }, []);

  // ── navigation state ────────────────────────────────────────────────────
  const [instance, setInstance] = useState<InventoryInstance | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  // ── listing form state ──────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

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
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    try {
      const condition = String(values.condition_label);

      // ── Marketplace panel values ────────────────────────────────────────
      const mpValues = extractMarketplaceListingValues(form, markets);
      const refurbed = mpValues.mp_refurbed;

      // Panel fields override the general form fields where applicable
      const taxation = refurbed.taxation || String(values.taxation || "GROSS");
      const warrantyMonths = refurbed.warranty_delay || "12";
      const shippingProfileId =
        refurbed.shipping_profile_id || String(values.shipping_profile_id || "");
      const referencePrice =
        refurbed.top_price || String(values.reference_price || "0");
      const referenceMinPrice = refurbed.block_price
        ? referencePrice // block price → floor = ceiling
        : refurbed.bottom_price || String(values.reference_min_price || "") || null;
      const referenceCurrency = markets[0]?.currency_code || "EUR";
      const marketCode = markets[0]?.code || "";

      // ── listing_details: backend-compatible keys ─────────────────────────
      // Backend reads: dont_send_quantity_XX, dont_send_price_XX, block_price_XX
      const listingDetailFields2 = [
        "title", "description", "condition_label", "item_cost", "asin",
        "smart_chain_id", "offer_tag", "vat_rate", "category", "subcategory",
        "custom_field", "shipment_country", "location", "logistic_weight",
        "product_weight", "product_width", "product_length", "product_height",
        "gpsr_name", "gpsr_address", "gpsr_address_details", "gpsr_city",
        "gpsr_region", "gpsr_country", "gpsr_zip", "gpsr_phone", "gpsr_email",
        "gpsr_safety_url", "gpsr_european_manufacturer",
      ];
      const listingDetails: Record<string, string> = Object.fromEntries(
        listingDetailFields2.map((field) => [field, String(values[field] ?? "").trim()])
      );

      // Panel storage keys (ui metadata + backend behaviour keys)
      listingDetails["mp_refurbed_activate"] = refurbed.activate ? "1" : "0";
      listingDetails["mp_refurbed_ean"] = refurbed.ean;
      listingDetails["mp_refurbed_battery_condition"] = refurbed.battery_condition;
      listingDetails["mp_refurbed_id"] = refurbed.refurbed_id;

      // Per-locale backend keys (the names the backend actually reads)
      for (const market of markets) {
        const locale = refurbed.locales[market.code];
        listingDetails[`dont_send_quantity_${market.code}`] =
          locale?.dont_send_quantity ? "1" : "0";
        listingDetails[`dont_send_price_${market.code}`] =
          locale?.dont_send_price ? "1" : "0";
        listingDetails[`block_price_${market.code}`] =
          locale?.block_price ? "1" : "0";
        // Also store the ui prefixed keys for seeding the panel on next load
        listingDetails[`mp_locale_${market.code}_price`] = locale?.price ?? "";
        listingDetails[`mp_locale_${market.code}_min_price`] = locale?.min_price ?? "";
      }

      // ── market_prices: use panel per-locale prices when set ─────────────
      const marketPrices = markets.map((market) => {
        const locale = refurbed.locales[market.code];
        const price = locale?.price || referencePrice;
        const minPrice = locale?.block_price
          ? price
          : locale?.min_price || referenceMinPrice || price;
        return { market_code: market.code, price, min_price: minPrice };
      });

      const payload: Record<string, unknown> = {
        sku: values.sku,
        grading: conditionGrade[condition] || "A",
        taxation,
        warranty: `M${warrantyMonths}` as "M12",
        stock: Number(values.stock),
        shipping_profile_id: shippingProfileId,
        reference_currency_code: referenceCurrency,
        reference_price: referencePrice,
        reference_min_price: referenceMinPrice || null,
        market_code: marketCode,
        market_prices: marketPrices,
        listing_details: listingDetails,
      };

      if (instance?.id) payload.instance_id = instance.id;
      else payload.gtin = values.gtin || refurbed.ean;
      const response = await createInventoryOffer(payload);
      setNotice(response.message);
      setTimeout(() => router.push("/dashboard/inventory"), 800);
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Unable to create listing.",
      );
    } finally {
      setBusy(false);
    }
  }

  // ── render: listing form (step 2) ────────────────────────────────────────
  if (instance || manualEntry)
    return (
      <Listing
        instance={instance}
        manual={manualEntry}
        busy={busy}
        notice={notice}
        error={formError}
        markets={markets}
        marketplaces={marketplaces}
        categories={categories}
        cancel={() => {
          setInstance(null);
          setManualEntry(false);
          setFormError("");
        }}
        submit={createListing}
      />
    );

  // ── render: find-item screen (step 1) ────────────────────────────────────
  return (
    <InventoryShell
      title="Find the item you want to sell"
      subtitle="Dashboard / Inventory / Add an item to your inventory"
    >
      {initError && <Alert kind="error">{initError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Panel 1: Search by EAN or SKU ── */}
        <EanAsinPanel onFound={(found) => setInstance(found)} />

        {/* ── Panel 2: Search by title / keyword ── */}
        <KeywordPanel
          categories={categories}
          onSelect={selectCatalogItem}
          onManualEntry={() => setManualEntry(true)}
        />
      </div>
    </InventoryShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EAN / SKU panel
// ─────────────────────────────────────────────────────────────────────────────

function EanAsinPanel({
  onFound,
}: {
  onFound: (instance: InventoryInstance) => void;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = value.trim();
    if (!identifier) return;

    setLoading(true);
    setError("");

    try {
      const identifierType = "ean_or_sku";
      const response = await findInventoryInstance(identifier, identifierType);
      onFound(response.data.instance);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No product found for that identifier.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ScanBarcode className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold text-slate-900">
          Search by EAN or SKU
        </h2>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        For multi-site sales, give preference to search by EAN
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block text-sm font-semibold text-slate-700">
          Search by EAN or SKU :
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            placeholder="e.g. 0194252670477 or IPHONE-128-BLACK"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Validate
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword / title panel
// ─────────────────────────────────────────────────────────────────────────────

function KeywordPanel({
  categories,
  onSelect,
  onManualEntry,
}: {
  categories: string[];
  onSelect: (item: RefurbedCatalogItem) => void;
  onManualEntry: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<RefurbedCatalogItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState({ keyword: "", category: "" });
  const [searchVersion, setSearchVersion] = useState(0);

  // Run search whenever keyword/category/page changes after first submit
  useEffect(() => {
    if (!submitted) return;
    if (!searchQuery.keyword && !searchQuery.category) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      searchRefurbedCatalog({
        search: searchQuery.keyword || undefined,
        category: searchQuery.category || undefined,
        page,
        limit: 10,
      })
        .then((response) => {
          if (!active) return;
          setResults(response.data.items);
          setPage(response.data.pagination.current_page);
          setLastPage(response.data.pagination.last_page);
          setTotal(response.data.pagination.total);
        })
        .catch((caught) => {
          if (active)
            setError(
              caught instanceof Error ? caught.message : "Search failed.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, page, submitted, searchVersion]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearchQuery({ keyword: keyword.trim(), category });
    setSearchVersion((current) => current + 1);
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Type className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold text-slate-900">
          Search by title or keyword(s):
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block text-sm font-semibold text-slate-700">
          Search by title or keyword(s):
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setError("");
                if (!e.target.value.trim() && !category) {
                  setSubmitted(false);
                  setResults([]);
                }
              }}
              placeholder="iPhone 14, Samsung Galaxy…"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </label>

        {categories.length > 0 && (
          <label className="block text-sm font-semibold text-slate-700">
            Category
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={loading || (!keyword.trim() && !category)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Validate
          </button>

          <button
            type="button"
            onClick={onManualEntry}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            <CirclePlus className="h-4 w-4" />
            Create a catalog entry
          </button>
        </div>
      </form>

      {/* Results list */}
      {submitted &&
        !loading &&
        results.length === 0 &&
        (keyword.trim() || category) && (
          <div className="mt-6 rounded-2xl bg-slate-50 px-6 py-10 text-center">
            <Package className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-700">
              No products found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try different keywords or{" "}
              <button
                type="button"
                onClick={onManualEntry}
                className="font-semibold text-blue-600 hover:underline"
              >
                create a catalog entry
              </button>
              .
            </p>
          </div>
        )}

      {!loading && results.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {results.map((item) => (
            <button
              key={item.instance_id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.name || item.name_de || `Instance ${item.instance_id}`}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {item.main_category ? `${item.main_category} · ` : ""}
                  ID {item.instance_id}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {total.toLocaleString()} results · page {page}/{lastPage}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Searching catalog…
        </div>
      )}
    </div>
  );
}

function Listing({
  instance,
  manual,
  busy,
  notice,
  error,
  markets,
  marketplaces,
  categories,
  cancel,
  submit,
}: {
  instance: InventoryInstance | null;
  manual: boolean;
  busy: boolean;
  notice: string;
  error: string;
  markets: InventoryMarket[];
  marketplaces: Marketplace[];
  categories: string[];
  cancel: () => void;
  submit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [marketplaceView, setMarketplaceView] = useState(false);
  // Currency is derived from the first available market; the marketplace panel
  // handles per-locale price overrides so no user-facing currency picker needed.
  const currency = markets[0]?.currency_code || "EUR";

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
                <b className="text-slate-900">On Refurbed</b>
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
        <ValidationContext.Provider value={fieldErrors}>
          <form
            noValidate
            onChangeCapture={(event) => {
              const control = event.target;
              if (!(
                control instanceof HTMLInputElement ||
                control instanceof HTMLSelectElement ||
                control instanceof HTMLTextAreaElement
              ))
                return;
              if (control.name)
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next[control.name];
                  return next;
                });
              control.removeAttribute("aria-invalid");
            }}
            onSubmit={(event) => {
              event.preventDefault();
              const controls = Array.from(event.currentTarget.elements).filter(
                (
                  element,
                ): element is
                  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
                  element instanceof HTMLInputElement ||
                  element instanceof HTMLSelectElement ||
                  element instanceof HTMLTextAreaElement,
              );
              const errors: Record<string, string> = {};
              let first: (typeof controls)[number] | undefined;
              for (const control of controls) {
                if (!control.willValidate) continue;
                const invalid = !control.validity.valid;
                control.setAttribute("aria-invalid", String(invalid));
                if (invalid) {
                  first ??= control;
                  errors[control.name] = control.validity.valueMissing
                    ? {
                        condition_label: "Please select the item's condition.",
                        sku: "Please enter a SKU.",
                        stock: "Quantity must not be blank.",
                        reference_price: "Enter a price of at least 0.01.",
                        shipping_profile_id:
                          "Please select a shipping profile.",
                      }[control.name] || "This field is required."
                    : control.validationMessage;
                  control.setAttribute(
                    "aria-describedby",
                    "error-" + control.name,
                  );
                }
              }

              // ── Manual checks for fields outside native validation ───────
              // Hidden inputs (type="hidden") are skipped by willValidate.
              // The ShippingProfileSelect uses a hidden input, so check it here.
              const shippingInput = event.currentTarget.elements.namedItem(
                "shipping_profile_id",
              ) as HTMLInputElement | null;
              if (shippingInput && !shippingInput.value.trim()) {
                errors["shipping_profile_id"] =
                  "Please select a shipping profile.";
                // Scroll to the shipping profile field label
                if (!first) {
                  const shippingField =
                    event.currentTarget.querySelector<HTMLElement>(
                      "[data-field='shipping_profile_id']",
                    );
                  if (shippingField)
                    shippingField.scrollIntoView({
                      block: "center",
                      behavior: "smooth",
                    });
                }
              }

              // The panel's top price drives reference_price; if the
              // marketplace panel view is open and its top price is blank, flag it.
              const panelTopPrice = event.currentTarget.elements.namedItem(
                "mp_refurbed_top_price",
              ) as HTMLInputElement | null;
              if (panelTopPrice && !panelTopPrice.value.trim()) {
                errors["mp_refurbed_top_price"] =
                  "Enter a top price of at least 0.01.";
              }
              setFieldErrors(errors);
              if (first || Object.keys(errors).length > 0) {
                // If the only errors are in the marketplace panel, switch to it
                const panelOnlyErrors =
                  !first &&
                  Object.keys(errors).every((k) =>
                    k.startsWith("mp_refurbed_") || k.startsWith("mp_locale_"),
                  );
                if (panelOnlyErrors) setMarketplaceView(true);
                else if (first) {
                  setMarketplaceView(
                    first.name.startsWith("price_") ||
                      first.name.startsWith("min_price_") ||
                      first.name.startsWith("mp_refurbed_"),
                  );
                  for (
                    let parent = first.parentElement;
                    parent;
                    parent = parent.parentElement
                  )
                    if (parent instanceof HTMLDetailsElement) parent.open = true;
                  const target = first;
                  window.setTimeout(() => {
                    target.focus();
                    target.scrollIntoView({
                      block: "center",
                      behavior: "smooth",
                    });
                  }, 0);
                }
                return;
              }
              void submit(event);
            }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_[aria-invalid=true]]:border-red-500 [&_[aria-invalid=true]]:ring-1 [&_[aria-invalid=true]]:ring-red-500"
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
                  markets={markets}
                />
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
                  </Section>
                </>
              )}
              {
                <Section title="General information" open>
                  <Field label="Title">
                    <textarea
                      name="title"
                      maxLength={500}
                      defaultValue={instance?.name}

                      className={`${controlClass} read-only:bg-slate-100 read-only:text-slate-500`}
                      rows={2}
                    />
                  </Field>
                  {
                    <Field label="Item cost">
                      <MoneyInput name="item_cost" currency={currency} />
                    </Field>
                  }
                  <GradeSelect />
                  <Input name="sku" label="SKU" required />
                  <Input
                    name="gtin"
                    label="EAN all marketplaces"
                    defaultValue={instance?.gtin}
                    required={manual}
                    disabled={!manual}
                  />

                  <Input name="stock" label="Quantity" type="number" required />
                  {
                    <Field label="Offer description">
                      <textarea
                        name="description"
                        maxLength={1000}
                        className={controlClass}
                        rows={3}
                      />
                    </Field>
                  }
                  <Field label="Top price" required>
                    <MoneyInput
                      name="reference_price"
                      currency={currency}
                    />
                  </Field>
                  {
                    <>
                      <Field label="Minimum price">
                        <MoneyInput
                          name="reference_min_price"
                          currency={currency}
                        />
                      </Field>
                      <Input
                        name="smart_chain_id"
                        label="Smart Chain (Chain id)"
                      />
                      <Input name="offer_tag" label="Offer tag" />
                      <Field label="VAT rate">
                        <UnitInput name="vat_rate" unit="%" />
                      </Field>
                      <Field label="Category">
                        <input
                          name="category"
                          defaultValue={instance?.category}
                          list="listing-categories"
                          className={controlClass}
                        />
                        <datalist id="listing-categories">
                          {categories.map((item) => (
                            <option key={item} value={item} />
                          ))}
                        </datalist>
                      </Field>
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
                  }
                  <Select
                    name="taxation"
                    label="Taxation"
                    values={["GROSS", "MARGINAL"]}
                    required
                  />
                  <p className="text-xs text-slate-500 md:col-span-2">
                    Refurbed uses the selected catalog product, grade, SKU,
                    quantity, shipping profile and prices. Supplementary
                    product, logistics and GPSR details are saved in CelleXa.
                  </p>
                  <Field label="Shipping profile" required>
                    <div data-field="shipping_profile_id">
                      <ShippingProfileSelect />
                    </div>
                    <FieldError name="shipping_profile_id" />
                  </Field>
                </Section>
              }
              {
                <Section title="Logistics information">
                  <Field label="Shipment country">
                    <CountrySelect name="shipment_country" />
                  </Field>
                  <Input name="location" label="Location" />
                  <Field label="Logistic weight">
                    <UnitInput name="logistic_weight" unit="kg" />
                  </Field>
                </Section>
              }
              {
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
              }
              {
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
                  <Input
                    name="gpsr_phone"
                    label="Telephone number"
                    type="tel"
                  />
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
              }
            </div>
            <div hidden={!marketplaceView}>
              <MarketplaceListingPanel
                markets={markets}
                marketplaces={marketplaces}
                currency={currency}
                fieldErrors={fieldErrors}
              />
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setMarketplaceView((current) => !current)}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {marketplaceView
                  ? "Back to default listing information"
                  : "Listing information by marketplaces ?"}
              </button>
            </div>
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
        </ValidationContext.Provider>
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
      <FieldError name={name} />
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
    <>
      <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
        <span className="grid place-items-center border-r border-slate-300 px-3 text-sm font-bold text-slate-500">
          {currency}
        </span>
        <input
          name={name}
          type="number"
          min={
            name === "reference_price" || name.startsWith("price_")
              ? "0.01"
              : "0"
          }
          step="0.01"
          required={required}
          className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
        />
      </div>
      <FieldError name={name} />
    </>
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
      <FieldError name="condition_label" />
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
