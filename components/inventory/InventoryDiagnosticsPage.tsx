"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileWarning,
  RefreshCw,
  Search,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryTablePage";
import { ContentLoading } from "@/components/ui/ContentLoading";
import {
  getInventoryDiagnostics,
  InventoryApiError,
  syncInventory,
} from "@/lib/api/inventory";
import type { InventoryDiagnosticsResponse } from "@/lib/api/inventory";

export function InventoryDiagnosticsPage() {
  const [response, setResponse] = useState<InventoryDiagnosticsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setResponse(await getInventoryDiagnostics());
    } catch (caught) {
      setError(
        caught instanceof InventoryApiError
          ? caught.message
          : "Unable to load offer diagnostics.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getInventoryDiagnostics()
      .then((result) => {
        if (active) setResponse(result);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof InventoryApiError
              ? caught.message
              : "Unable to load offer diagnostics.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const errors = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = response?.data.errors ?? [];
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(query) ||
        row.message.toLowerCase().includes(query) ||
        row.skus.some((sku) => sku.toLowerCase().includes(query)),
    );
  }, [response, search]);

  async function synchronize() {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const result = await syncInventory();
      setMessage(
        `${result.data.synchronized} offers synchronized. Diagnostics are now up to date.`,
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof InventoryApiError
          ? caught.message
          : "Unable to synchronize inventory.",
      );
    } finally {
      setSyncing(false);
    }
  }

  function downloadExcel() {
    const rows = [
      ["Marketplace", "Error ID", "Error message", "SKU"],
      ...errors.flatMap((row) =>
        row.skus.length
          ? row.skus.map((sku) => [marketplaceName, row.code, row.message, sku])
          : [[marketplaceName, row.code, row.message, ""]],
      ),
    ];
    const escape = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const content = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Offer errors"><Table>${rows.map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="String">${escape(value)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/vnd.ms-excel" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `offer-errors-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const marketplace = response?.data.marketplace;
  const marketplaceName =
    marketplace?.account_name || marketplace?.name || "Refurbed";
  const logo =
    marketplace?.slug === "back-market"
      ? "/images/marketplaces/back-market.jpg"
      : "/images/marketplaces/refurbed.png";
  const impactedOffers = new Set(
    (response?.data.errors ?? []).flatMap((row) => row.skus),
  ).size;

  return (
    <InventoryShell
      title="Error diagnosis"
      subtitle="Review marketplace errors affecting your synchronized offers."
    >
      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
        >
          {message}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </span>
          <button onClick={() => void load()} className="font-bold">
            Retry
          </button>
        </div>
      )}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <label
                htmlFor="diagnostic-marketplace"
                className="text-lg font-bold text-slate-900"
              >
                Select a marketplace to see errors
              </label>
              <div className="relative mt-3">
                <Image
                  src={logo}
                  alt=""
                  width={24}
                  height={24}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 object-contain"
                />
                <select
                  id="diagnostic-marketplace"
                  value={marketplace?.slug || "refurbed"}
                  disabled
                  className="min-w-64 rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-10 text-sm font-bold text-slate-800 disabled:cursor-default disabled:opacity-100"
                >
                  <option value={marketplace?.slug || "refurbed"}>
                    {marketplaceName}
                  </option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-80">
              <Stat
                label="Error groups"
                value={response?.data.errors.length ?? 0}
              />
              <Stat label="Offers impacted" value={impactedOffers} />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search error ID, message or SKU"
                className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadExcel}
                disabled={errors.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-500 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Download Excel
              </button>
              <button
                onClick={() => void synchronize()}
                disabled={syncing || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Synchronizing…" : "Refresh diagnostics"}
              </button>
            </div>
          </div>
          {response?.data.last_synced_at && (
            <p className="mt-4 text-xs text-slate-500">
              Last synchronized:{" "}
              {new Date(response.data.last_synced_at).toLocaleString()}
            </p>
          )}
        </div>
        {loading ? (
          <div className="min-h-64 p-8">
            <ContentLoading label="Loading offer diagnostics" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-4">Error ID</th>
                  <th className="px-6 py-4">Error message</th>
                  <th className="px-6 py-4">SKUs impacted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {errors.map((row) => (
                  <tr
                    key={`${row.code}-${row.message}`}
                    className="align-top hover:bg-blue-50/40"
                  >
                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-lg bg-red-50 px-3 py-1.5 font-bold text-red-700">
                        {row.code}
                      </span>
                    </td>
                    <td className="max-w-2xl px-6 py-5 leading-6 text-slate-700">
                      {row.message}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex max-w-xl flex-wrap gap-2">
                        {row.skus.length ? (
                          row.skus.map((sku) => (
                            <span
                              key={sku}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700"
                            >
                              {sku}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">
                            No SKU supplied
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errors.length === 0 && (
              <div className="grid min-h-64 place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    {search ? (
                      <FileWarning className="h-7 w-7" />
                    ) : (
                      <CheckCircle2 className="h-7 w-7" />
                    )}
                  </span>
                  <h3 className="mt-4 font-bold text-slate-900">
                    {search ? "No matching errors" : "No offer errors found"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {search
                      ? "Try a different error ID, message, or SKU."
                      : "Your synchronized offers currently have no reported marketplace errors."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </InventoryShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
