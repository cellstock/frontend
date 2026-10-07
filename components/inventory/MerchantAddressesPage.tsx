"use client";

import { LoaderCircle, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import {
  createMerchantAddress,
  deleteMerchantAddress,
  getMerchantAddressRecords,
  MerchantAddressInput,
  MerchantAddressRecord,
  updateMerchantAddress,
} from "@/lib/api/merchant-addresses";

const emptyAddress: MerchantAddressInput = {
  type: "DELIVERY",
  label: "",
  first_name: "",
  family_name: "",
  company_name: "",
  country_code: "",
  post_code: "",
  town: "",
  street_name: "",
  house_no: "",
  supplement: "",
  phone_number: "",
};

export function MerchantAddressesPage() {
  const [addresses, setAddresses] = useState<MerchantAddressRecord[]>([]);
  const [editing, setEditing] = useState<
    MerchantAddressRecord | null | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await getMerchantAddressRecords();
      setAddresses(response.data.addresses);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load addresses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(address: MerchantAddressRecord) {
    if (!window.confirm(`Delete ${address.label || address.company_name}?`))
      return;
    setBusy(true);
    setError("");
    try {
      await deleteMerchantAddress(address.id);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to delete the address.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
            <MapPin className="h-5 w-5" />
            Inventory
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Merchant addresses
          </h1>
          <p className="mt-2 text-slate-600">
            Manage delivery and return addresses from CelleXa.
          </p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >
          <Plus className="h-5 w-5" />
          Add address
        </button>
      </header>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-slate-500">Loading saved addresses…</p>
        ) : addresses.length === 0 ? (
          <p className="p-8 text-slate-500">
            No merchant addresses are stored yet.
          </p>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {address.type}
                    </span>
                    <h2 className="mt-3 font-bold text-slate-900">
                      {address.label || address.company_name}
                    </h2>
                  </div>
                  <SyncBadge status={address.sync_status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {address.company_name}
                  <br />
                  {address.street_name} {address.house_no}
                  <br />
                  {address.post_code} {address.town}, {address.country_code}
                </p>
                {address.sync_error && (
                  <p className="mt-3 text-xs text-red-600">
                    {address.sync_error}
                  </p>
                )}
                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setEditing(address)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void remove(address)}
                    className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing !== undefined && (
        <AddressModal
          address={editing}
          onClose={() => setEditing(undefined)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function AddressModal({
  address,
  onClose,
  onSaved,
}: {
  address: MerchantAddressRecord | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [values, setValues] = useState<MerchantAddressInput>(
    address
      ? {
          type: address.type,
          label: address.label,
          first_name: address.first_name,
          family_name: address.family_name,
          company_name: address.company_name,
          country_code: address.country_code,
          post_code: address.post_code,
          town: address.town,
          street_name: address.street_name,
          house_no: address.house_no,
          supplement: address.supplement,
          phone_number: address.phone_number,
        }
      : emptyAddress,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function change(name: keyof MerchantAddressInput, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (address) await updateMerchantAddress(address.id, values);
      else await createMerchantAddress(values);
      await onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save the address.",
      );
    } finally {
      setBusy(false);
    }
  }

  const fields: Array<[keyof MerchantAddressInput, string, boolean]> = [
    ["label", "Address label", false],
    ["company_name", "Company name", true],
    ["first_name", "First name", false],
    ["family_name", "Family name", false],
    ["street_name", "Street", true],
    ["house_no", "House number", true],
    ["supplement", "Address supplement", false],
    ["post_code", "Post code", true],
    ["town", "Town", true],
    ["country_code", "Country code", true],
    ["phone_number", "Phone number", false],
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold">
            {address ? "Edit address" : "Add address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Address type
            <select
              value={values.type}
              onChange={(event) => change("type", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="DELIVERY">Delivery</option>
              <option value="RETURN">Return</option>
            </select>
          </label>
          {fields.map(([name, label, required]) => (
            <label key={name} className="text-sm font-semibold">
              {label}
              <input
                required={required}
                value={values[name] ?? ""}
                onChange={(event) => change(name, event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          ))}
          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Save
            address
          </button>
        </footer>
      </form>
    </div>
  );
}

function SyncBadge({
  status,
}: {
  status: MerchantAddressRecord["sync_status"];
}) {
  const styles =
    status === "synced"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${styles}`}
    >
      {status}
    </span>
  );
}
