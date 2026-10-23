"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import AppLink from "@/components/ui/AppLink";
import {
  getPushPreferences,
  runMarketplacePush,
  type PushTarget,
} from "@/lib/api/push-preferences";
import { publicPath } from "@/lib/public-path";

export function PushToMarketplacesPanel({
  onMessage,
}: {
  onMessage?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<PushTarget[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPushPreferences()
      .then((response) => {
        const items = response.data.targets ?? [];
        setTargets(items);
        setSelected([]);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load push marketplaces.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const enabledIds = targets.filter((item) => item.enabled).map((item) => item.id);
  const allEnabledSelected =
    enabledIds.length > 0 && enabledIds.every((id) => selected.includes(id));
  const someEnabledSelected =
    enabledIds.some((id) => selected.includes(id)) && !allEnabledSelected;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function toggleAll() {
    setSelected((current) =>
      allEnabledSelected
        ? current.filter((id) => !enabledIds.includes(id))
        : Array.from(new Set([...current, ...enabledIds])),
    );
  }

  async function pushSelected() {
    const enabledSelected = selected.filter((id) =>
      targets.some((target) => target.id === id && target.enabled),
    );
    if (enabledSelected.length === 0) {
      setError("Select at least one enabled marketplace to push.");
      return;
    }

    setPushing(true);
    setError("");

    try {
      const response = await runMarketplacePush(enabledSelected);
      setTargets(response.data.targets ?? []);
      onMessage?.(response.message || "Push completed.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to push inventory to marketplaces.",
      );
    } finally {
      setPushing(false);
    }
  }

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-5 py-4 text-left lg:px-7"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Push to marketplaces
        </h2>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
          <ChevronDown
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-5 pb-5 lg:px-7 lg:pb-7">
          {loading ? (
            <p className="pt-4 text-sm text-slate-600">Loading marketplaces…</p>
          ) : targets.length === 0 ? (
            <p className="pt-4 text-sm text-slate-600">
              Connect Refurbed or Back Market and enable country markets in
              marketplace settings to push inventory.
            </p>
          ) : (
            <>
              {error && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="w-10 px-3 py-3 font-medium">
                        <input
                          type="checkbox"
                          checked={allEnabledSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someEnabledSelected;
                          }}
                          disabled={enabledIds.length === 0}
                          onChange={toggleAll}
                          aria-label="Select all marketplaces"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 disabled:opacity-40"
                        />
                      </th>
                      <th className="py-3 pr-4 font-medium">Marketplace</th>
                      <th className="py-3 pr-4 font-medium">
                        Number of listings and modifications to upload
                      </th>
                      <th className="py-3 pr-3 font-medium">Last push</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selected.includes(item.id)}
                            disabled={!item.enabled}
                            onChange={() => toggle(item.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <div className="flex items-start gap-3">
                            {item.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={publicPath(item.logo)}
                                alt=""
                                className="mt-0.5 h-7 w-7 rounded object-contain"
                              />
                            ) : null}
                            <div>
                              <p
                                className={`font-semibold ${
                                  item.enabled
                                    ? "text-slate-900"
                                    : "text-slate-500"
                                }`}
                              >
                                {item.name}
                              </p>
                              {!item.enabled && item.disabled_message && (
                                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
                                  {item.disabled_message}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-top font-medium text-slate-800">
                          {item.enabled ? item.pending_count.toLocaleString() : ""}
                        </td>
                        <td className="py-3 pr-3 align-top text-slate-600">
                          {item.enabled
                            ? item.last_pushed_at
                              ? new Date(item.last_pushed_at).toLocaleString()
                              : "—"
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <AppLink
                  href="/dashboard/marketplaces"
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  Add new marketplaces
                </AppLink>
                <button
                  type="button"
                  disabled={
                    pushing ||
                    selected.filter((id) =>
                      targets.some(
                        (target) => target.id === id && target.enabled,
                      ),
                    ).length === 0
                  }
                  onClick={pushSelected}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {pushing ? "Pushing…" : "Push"}
                </button>
              </div>

              <div className="mt-3">
                <AppLink
                  href="/dashboard/synchronization-issues"
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  Check the errors returned by marketplaces
                </AppLink>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
