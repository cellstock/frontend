"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryTablePage";
import { ContentLoading } from "@/components/ui/ContentLoading";
import {
  deleteShippingProfile,
  getShippingCarriers,
  getShippingProfiles,
  saveShippingProfile,
  ShippingCarrier,
  ShippingProfile,
  ShippingProfilePagination,
  syncShippingProfiles,
} from "@/lib/api/shipping-profiles";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function ShippingProfilesPage() {
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [pagination, setPagination] = useState<ShippingProfilePagination>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
  });
  const [countries, setCountries] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [deletable, setDeletable] = useState("");
  const [sort, setSort] = useState<"name" | "newest" | "offers">("name");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ShippingProfile | null | undefined>(
    undefined,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProfiles = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      return getShippingProfiles({
        search: search.trim() || undefined,
        source_country: country || undefined,
        deletable:
          deletable === "yes" || deletable === "no" ? deletable : undefined,
        sort,
        page,
        per_page: perPage,
      })
        .then((response) => {
          if (signal?.aborted) return;

          setProfiles(response.data.profiles);
          setPagination(response.data.pagination);
          setCountries(response.data.filters.source_countries);
        })
        .catch((reason) => {
          if (signal?.aborted) return;

          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load shipping profiles.",
          );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [search, country, deletable, sort, page, perPage],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => {
        void loadProfiles(controller.signal);
      },
      search ? 300 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadProfiles, search]);

  function resetFilters() {
    setSearch("");
    setCountry("");
    setDeletable("");
    setSort("name");
    setPage(1);
  }

  async function sync() {
    setBusy(true);
    setError("");
    try {
      const response = await syncShippingProfiles();
      setMessage(
        `${response.data.synchronized} shipping profiles synchronized.`,
      );
      await loadProfiles();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Synchronization failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(profile: ShippingProfile) {
    setBusy(true);
    setError("");
    try {
      const response = await deleteShippingProfile(profile.id);
      setMessage(response.message);
      await loadProfiles();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to delete this profile.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <InventoryShell
      title="Shipping profiles"
      subtitle="Manage warehouse origins, destinations, delivery times, carriers, and shipping costs on Refurbed."
    >
      {message && (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Refurbed shipping profiles
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {pagination.total}{" "}
                {pagination.total === 1 ? "profile" : "profiles"} stored
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void sync()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
                />
                Synchronize
              </button>
              <button
                onClick={() => setEditing(null)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create profile
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_180px_180px_auto]">
            <label className="relative">
              <span className="sr-only">Search shipping profiles</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, ID or destination"
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <FilterSelect
              value={country}
              onChange={(value) => {
                setCountry(value);
                setPage(1);
              }}
              label="All source countries"
              options={countries.map((code) => ({
                value: code,
                label: code.toUpperCase(),
              }))}
            />
            <FilterSelect
              value={deletable}
              onChange={(value) => {
                setDeletable(value);
                setPage(1);
              }}
              label="All delete states"
              options={[
                { value: "yes", label: "Can be deleted" },
                { value: "no", label: "In use / protected" },
              ]}
            />
            <FilterSelect
              value={sort}
              onChange={(value) => {
                setSort(value as typeof sort);
                setPage(1);
              }}
              label="Sort"
              options={[
                { value: "name", label: "Name A-Z" },
                { value: "newest", label: "Newest" },
                { value: "offers", label: "Most active offers" },
              ]}
            />
            <button
              onClick={resetFilters}
              className="rounded-xl px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50"
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <ContentLoading label="Loading shipping profiles" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Profile</th>
                    <th className="px-6 py-4">Ships from</th>
                    <th className="px-6 py-4">Destinations</th>
                    <th className="px-6 py-4">Active offers</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-blue-50/40">
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900">
                          {profile.name || "Unnamed profile"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Refurbed ID: {profile.id}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-700">
                        {profile.source_country_market_name ||
                          profile.source_country_code?.toUpperCase() ||
                          "-"}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {profile.destinations
                            .slice(0, 4)
                            .map((destination) => (
                              <span
                                key={destination.market_code}
                                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700"
                              >
                                {destination.market_code.toUpperCase()}
                              </span>
                            ))}
                          {profile.destinations.length > 4 && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                              +{profile.destinations.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-slate-800">
                        {profile.num_offers_assigned}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            profile.is_deletable
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {profile.is_deletable ? "Available" : "In use"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditing(profile)}
                            title="Edit profile"
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void remove(profile)}
                            disabled={busy || !profile.is_deletable}
                            title={
                              profile.is_deletable
                                ? "Delete profile"
                                : "Move assigned offers before deletion"
                            }
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <Truck className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-bold text-slate-800">
                          No shipping profiles found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing the search or filters.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {pagination.total === 0
                  ? "No results"
                  : `Showing ${pagination.from}-${pagination.to} of ${pagination.total}`}
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={perPage}
                  onChange={(event) => {
                    setPerPage(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <button
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-300 p-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
                  Page {pagination.current_page} of {pagination.last_page}
                </span>
                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= pagination.last_page}
                  className="rounded-xl border border-slate-300 p-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {editing !== undefined && (
        <ProfileModal
          profile={editing}
          close={() => setEditing(undefined)}
          saved={(_, text) => {
            setEditing(undefined);
            setMessage(text);
            void loadProfiles();
          }}
        />
      )}
    </InventoryShell>
  );
}

type FilterOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  value: string;
  label: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

function FilterSelect({ value, label, options, onChange }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function value(profile: ShippingProfile | null, path: string, fallback = "") {
  let current: unknown = profile?.details;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return fallback;
    current = (current as Record<string, unknown>)[part];
  }
  return current == null ? fallback : String(current);
}

function ProfileModal({
  profile,
  close,
  saved,
}: {
  profile: ShippingProfile | null;
  close: () => void;
  saved: (profile: ShippingProfile | undefined, message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [loadingCarriers, setLoadingCarriers] = useState(true);

  useEffect(() => {
    let active = true;
    getShippingCarriers()
      .then((response) => {
        if (active) setCarriers(response.data.carriers);
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load Refurbed carriers.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingCarriers(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const v = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      name: v.name,
      source: {
        address: {
          country_code: v.source_country_code,
          postal_code: v.source_postal_code,
          city: v.source_city,
          street: v.source_street,
          house_number: v.source_house_number,
        },
      },
      destinations: [
        {
          country_code: v.destination_country_code,
          shipping_cost: {
            amount: v.shipping_cost,
            currency_code: v.currency_code,
          },
          min_delivery_days: Number(v.min_delivery_days),
          max_delivery_days: Number(v.max_delivery_days),
          carrier: v.carrier,
          order_cutoff_time: v.order_cutoff_time,
        },
      ],
    };
    try {
      const response = await saveShippingProfile(payload, profile?.id);
      saved(response.data.profile, response.message);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save shipping profile.",
      );
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-sm font-bold text-blue-600">Refurbed shipping</p>
            <h2 className="mt-1 text-xl font-bold">
              {profile ? "Edit shipping profile" : "Create shipping profile"}
            </h2>
          </div>
          <button onClick={close} className="rounded-xl p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6">
          {error && (
            <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
          <h3 className="font-bold text-slate-900">Profile and warehouse</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              name="name"
              label="Profile name"
              required
              initial={profile?.name || ""}
            />
            <Field
              name="source_country_code"
              label="Source country code"
              required
              initial={profile?.source_country_code || ""}
            />
            <Field
              name="source_postal_code"
              label="Postal code"
              required
              initial={value(profile, "source.address.postal_code")}
            />
            <Field
              name="source_city"
              label="City"
              required
              initial={value(profile, "source.address.city")}
            />
            <Field
              name="source_street"
              label="Street"
              required
              initial={value(profile, "source.address.street")}
            />
            <Field
              name="source_house_number"
              label="House number"
              required
              initial={value(profile, "source.address.house_number")}
            />
          </div>
          <h3 className="mt-7 font-bold text-slate-900">
            Destination and delivery
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              name="destination_country_code"
              label="Destination country code"
              required
              initial={
                profile?.destinations[0]?.market_code ??
                value(profile, "destinations.0.country_code")
              }
            />
            <label className="text-sm font-semibold text-slate-700">
              Carrier
              <select
                name="carrier"
                required
                disabled={loadingCarriers}
                defaultValue={value(profile, "destinations.0.carrier")}
                className={`${inputClass} bg-white disabled:cursor-wait disabled:bg-slate-100`}
              >
                <option value="">
                  {loadingCarriers
                    ? "Loading carriers..."
                    : carriers.length === 0
                      ? "No carriers stored. Synchronize first"
                      : "Select a carrier"}
                </option>
                {carriers.map((carrier) => (
                  <option key={carrier.slug} value={carrier.slug}>
                    {carrier.name} ({carrier.slug})
                  </option>
                ))}
              </select>
            </label>
            <Field
              name="shipping_cost"
              label="Shipping cost"
              type="number"
              step="0.01"
              required
              initial={
                profile?.destinations[0]?.shipping_costs ??
                value(profile, "destinations.0.shipping_cost.amount", "0")
              }
            />
            <Field
              name="currency_code"
              label="Currency code"
              required
              initial={
                profile?.destinations[0]?.currency_code ??
                value(
                  profile,
                  "destinations.0.shipping_cost.currency_code",
                  "EUR",
                )
              }
            />
            <Field
              name="min_delivery_days"
              label="Minimum delivery days"
              type="number"
              required
              initial={value(profile, "destinations.0.min_delivery_days")}
            />
            <Field
              name="max_delivery_days"
              label="Maximum delivery days"
              type="number"
              required
              initial={value(profile, "destinations.0.max_delivery_days")}
            />
            <Field
              name="order_cutoff_time"
              label="Order cut-off time"
              type="time"
              required
              initial={value(profile, "destinations.0.order_cutoff_time")}
            />
          </div>
          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  initial,
  type = "text",
  step,
  required = false,
}: {
  name: string;
  label: string;
  initial: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        name={name}
        defaultValue={initial}
        type={type}
        step={step}
        min={type === "number" ? 0 : undefined}
        required={required}
        className={inputClass}
      />
    </label>
  );
}
