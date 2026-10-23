"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "@/components/ui/AppLink";
import {
  getPushPreferences,
  updatePushPreferences,
  type PushMarketplace,
  type PushSlot,
} from "@/lib/api/push-preferences";
import { publicPath } from "@/lib/public-path";

export default function PushPreferencesPage() {
  const [marketplaces, setMarketplaces] = useState<PushMarketplace[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [slots, setSlots] = useState<PushSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPushPreferences()
      .then((response) => {
        const items = response.data.marketplaces;
        setMarketplaces(items);
        const first = items[0];
        if (first) {
          setSelectedSlug(first.marketplace_slug);
          setSlots(first.preference.slots);
        }
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load push preferences.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => marketplaces.find((item) => item.marketplace_slug === selectedSlug),
    [marketplaces, selectedSlug],
  );

  function selectMarketplace(slug: string) {
    const item = marketplaces.find((entry) => entry.marketplace_slug === slug);
    if (!item) return;
    setSelectedSlug(slug);
    setSlots(item.preference.slots);
    setError("");
    setMessage("");
  }

  function updateSlot(key: string, patch: Partial<PushSlot>) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlug) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await updatePushPreferences(selectedSlug, slots);
      setMarketplaces((current) =>
        current.map((item) =>
          item.marketplace_slug === selectedSlug
            ? { ...item, preference: response.data.preference }
            : item,
        ),
      );
      setSlots(response.data.preference.slots);
      setMessage(response.message || "Push preferences saved successfully.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save push preferences.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-sky-50/70 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Settings</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Define the programming of your push
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your inventory can be updated without your intervention, according
              to the options you enter below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/settings"
              className="rounded-xl border border-blue-500 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="push-preferences-form"
              disabled={saving || loading || !selectedSlug}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Validate"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <form
          id="push-preferences-form"
          onSubmit={save}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          {loading ? (
            <p className="text-sm text-slate-600">Loading push preferences…</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="space-y-2">
                {marketplaces.map((item) => {
                  const active = item.marketplace_slug === selectedSlug;
                  return (
                    <button
                      key={item.marketplace_slug}
                      type="button"
                      onClick={() => selectMarketplace(item.marketplace_slug)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      {item.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={publicPath(item.logo)}
                          alt=""
                          className="h-8 w-8 rounded object-contain"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
                          {item.name.slice(0, 2)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">
                          {item.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {item.connected ? "Connected" : "Not connected"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </aside>

              <div>
                {selected && !selected.connected && (
                  <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Connect {selected.name} in Marketplaces before scheduled
                    pushes can run. Your schedule is still saved.
                  </p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {slots.map((slot) => (
                    <section
                      key={slot.key}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <h2 className="text-sm font-bold text-slate-900">
                        Time slot from {slot.from} to {slot.to}
                      </h2>

                      <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={slot.active}
                          onChange={(event) =>
                            updateSlot(slot.key, {
                              active: event.target.checked,
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Activate programming during this time slot.</span>
                      </label>

                      <div className="mt-4 space-y-3">
                        <TimeField
                          label="Start at"
                          value={slot.start_at}
                          onChange={(start_at) =>
                            updateSlot(slot.key, { start_at })
                          }
                        />
                        <TimeField
                          label="Push every"
                          value={slot.every}
                          onChange={(every) =>
                            updateSlot(slot.key, { every })
                          }
                        />
                      </div>
                    </section>
                  ))}
                </div>

                {selected?.preference.last_pushed_at && (
                  <p className="mt-4 text-xs text-slate-500">
                    Last push:{" "}
                    {new Date(
                      selected.preference.last_pushed_at,
                    ).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-2 text-sm text-slate-700">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="\d{1,2}:\d{2}"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-slate-500">Hours</span>
    </label>
  );
}
