"use client";

import {
  ChevronDown,
  Loader2,
  RefreshCw,
  ScanBarcode,
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
import { MarketplaceSelectorRow } from "@/components/inventory/MarketplaceSelectorRow";

import { InventoryShell } from "@/components/inventory/InventoryTablePage";
import {
  createInventoryOffer,
  findInventoryInstance,
  getInventory,
} from "@/lib/api/inventory";
import { getMarketplaces } from "@/lib/api/marketplaces";
import { getShippingProfiles } from "@/lib/api/shipping-profiles";
import { isBackMarket, isRefurbed } from "@/lib/marketplaces/slugs";
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
  const [markets, setMarkets] = useState<InventoryMarket[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [initError, setInitError] = useState("");

  useEffect(() => {
    Promise.all([getInventory({ limit: 1 }), getMarketplaces()])
      .then(([inventoryResponse, marketplaceResponse]) => {
        setMarketplaces([
          ...marketplaceResponse.data.connected,
          ...marketplaceResponse.data.available,
        ]);
        setMarkets(inventoryResponse.data.markets);
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

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    try {
      const condition = String(values.condition_label || "");
      const sku = String(values.sku ?? "").trim();
      const stock = Number(values.stock);
      const title = String(values.title ?? "").trim();
      const selectedSlugs = form
        .getAll("marketplace_slugs[]")
        .map((value) => String(value));

      if (selectedSlugs.length === 0) {
        throw new Error("Select at least one marketplace to sell on.");
      }
      if (!sku) throw new Error("Please enter a SKU.");
      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error("Quantity must be zero or greater.");
      }

      const referenceCurrency = markets[0]?.currency_code || "EUR";
      const marketCode = markets[0]?.code || "";
      const listingDetails: Record<string, string> = {
        title,
        condition_label: condition,
      };

      // Default sell price — required by Refurbed CreateOffer; not shown in the simplified UI.
      const referencePrice = "1.00";
      const marketPrices = markets.map((market) => ({
        market_code: market.code,
        price: referencePrice,
        min_price: referencePrice,
      }));

      let shippingProfileId = "";
      const hasRefurbed = selectedSlugs.some((slug) => isRefurbed(slug));
      if (hasRefurbed) {
        if (!marketCode) {
          throw new Error(
            "No Refurbed market is enabled for offer management. Check marketplace settings.",
          );
        }
        const profiles = await getShippingProfiles({ page: 1, per_page: 1 });
        shippingProfileId = String(profiles.data.profiles[0]?.id || "").trim();
        if (!shippingProfileId) {
          throw new Error(
            "Create a shipping profile before adding a Refurbed listing.",
          );
        }
      }

      const instanceId = String(instance?.id || "").replace(/\D+/g, "");
      const gtin = String(instance?.gtin || "").replace(/\D+/g, "");

      for (const slug of selectedSlugs) {
        const payload: Record<string, unknown> = {
          sku,
          grading: conditionGrade[condition] || "A",
          taxation: "GROSS",
          warranty: "M12",
          stock,
          reference_currency_code: referenceCurrency,
          reference_price: referencePrice,
          reference_min_price: referencePrice,
          listing_details: listingDetails,
          marketplace: slug,
        };

        if (isRefurbed(slug)) {
          payload.shipping_profile_id = shippingProfileId;
          payload.market_code = marketCode;
          payload.market_prices = marketPrices;
          if (instanceId) payload.instance_id = instanceId;
          else if (gtin) payload.gtin = gtin;
          else {
            throw new Error(
              "A Refurbed instance ID or recognized GTIN/EAN is required.",
            );
          }
        } else if (isBackMarket(slug)) {
          // Back Market listings need a catalog product id; reuse Refurbed instance when present.
          const productId = instanceId || gtin;
          if (!productId) {
            throw new Error(
              "A product ID/EAN is required to create a Back Market listing.",
            );
          }
          payload.product_id = productId;
          payload.backmarket_id = productId;
          payload.instance_id = productId;
          if (gtin) payload.gtin = gtin;
        }

        await createInventoryOffer(payload);
      }

      setNotice("Listing saved in CelleXa and sent to the selected marketplaces.");
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
      {formError && <Alert kind="error">{formError}</Alert>}
      {busy && (
        <p className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking product on Refurbed…
        </p>
      )}

      <div className="max-w-2xl">
        <EanAsinPanel
          onFound={(found) => {
            setFormError("");
            setInstance({
              ...found,
              id: String(found.id ?? ""),
              gtin: found.gtin ? String(found.gtin) : undefined,
            });
          }}
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
      // Prefer ean_or_sku so EAN, ASIN/MPN, SKU, and Instance ID all resolve.
      const response = await findInventoryInstance(identifier, "ean_or_sku");
      onFound(response.data.instance);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No product found for that EAN, ASIN, or SKU.",
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
          Search by EAN, ASIN or SKU
        </h2>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        For multi-site sales, give preference to search by EAN
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block text-sm font-semibold text-slate-700">
          Search by EAN, ASIN or SKU :
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            placeholder="e.g. 0194252670477 or your SKU"
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

function Listing({
  instance,
  manual,
  busy,
  notice,
  error,
  markets,
  marketplaces,
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
  cancel: () => void;
  submit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
                <b className="text-slate-900">Listing</b>
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
              if (
                !(
                  control instanceof HTMLInputElement ||
                  control instanceof HTMLSelectElement ||
                  control instanceof HTMLTextAreaElement
                )
              )
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
                  | HTMLInputElement
                  | HTMLSelectElement
                  | HTMLTextAreaElement =>
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
                    ? (
                        {
                          condition_label: "Please select the item's condition.",
                          sku: "Please enter a SKU.",
                          stock: "Quantity must not be blank.",
                          title: "Please enter a title.",
                        } as Record<string, string>
                      )[control.name] || "This field is required."
                    : control.validationMessage;
                }
              }
              const selected = event.currentTarget.querySelectorAll(
                'input[name="marketplace_slugs[]"]',
              );
              if (selected.length === 0) {
                errors.marketplaces = "Select at least one marketplace.";
              }
              setFieldErrors(errors);
              if (Object.keys(errors).length > 0) {
                first?.focus();
                return;
              }
              void submit(event);
            }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_[aria-invalid=true]]:border-red-500 [&_[aria-invalid=true]]:ring-1 [&_[aria-invalid=true]]:ring-red-500"
          >
            <h2 className="border-b border-slate-200 p-6 text-2xl font-bold text-slate-900">
              Listing information
            </h2>
            <Section title="Sell on the following marketplaces" open>
              <MarketplaceSelectorRow
                marketplaces={marketplaces}
                markets={markets}
              />
              {fieldErrors.marketplaces && (
                <p className="text-sm text-red-600 md:col-span-2">
                  {fieldErrors.marketplaces}
                </p>
              )}
            </Section>
            <Section title="General information" open>
              <Field label="Title" required>
                <textarea
                  name="title"
                  maxLength={500}
                  required
                  defaultValue={instance?.name}
                  className={controlClass}
                  rows={2}
                />
                <FieldError name="title" />
              </Field>
              <GradeSelect />
              <Input
                name="sku"
                label="SKU"
                required
                defaultValue={instance?.sku}
              />
              <Input name="stock" label="Quantity" type="number" required />
              <p className="text-xs text-slate-500 md:col-span-2">
                Validate saves the listing in CelleXa and on the selected
                marketplaces. Quantity is shared — an order on one marketplace
                updates stock on all of them.
              </p>
            </Section>
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
