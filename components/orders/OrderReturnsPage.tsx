"use client";

import { RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Link from "@/components/ui/AppLink";
import {
  getAllOrderReturns,
  OrderReturn,
  OrdersApiError,
} from "@/lib/api/orders";
import { formatOrderDateTime } from "@/lib/orders/formatters";

const pageSize = 20;

export function OrderReturnsPage() {
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getAllOrderReturns(controller.signal)
      .then((response) => setReturns(response.data.returns))
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof OrdersApiError
              ? caught.message
              : "Unable to load returns from Refurbed.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return returns.filter((item) => {
      const matchesState = !state || item.state === state;
      const matchesSearch =
        !search ||
        [
          item.order_id,
          item.instance_name,
          item.tracking_number,
          item.marketplace_account,
        ].some((value) => value?.toLowerCase().includes(search));

      return matchesState && matchesSearch;
    });
  }, [query, returns, state]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleReturns = filtered.slice((page - 1) * pageSize, page * pageSize);
  const states = [...new Set(returns.map((item) => item.state))].sort();

  function updateSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <div className="min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
          <RotateCcw className="h-5 w-5" />
          Orders
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Returns</h1>
        <p className="mt-2 text-slate-600">
          Track customer returns received from Refurbed.
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search order, item or tracking number"
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="">All return states</option>
            {states.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">State</th>
                <th className="px-5 py-4">Started</th>
                <th className="px-5 py-4">Tracking</th>
                <th className="px-5 py-4">Trial period</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                null
              ) : visibleReturns.length === 0 ? (
                <EmptyRow text="No returns match your filters." />
              ) : (
                visibleReturns.map((item) => (
                  <tr
                    key={`${item.marketplace_account}-${item.id}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        #{item.order_id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.marketplace_account || "Refurbed"}
                      </p>
                    </td>
                    <td className="max-w-xs px-5 py-4 font-medium text-slate-700">
                      {item.instance_name}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.state.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatOrderDateTime(item.return_initiated_at)}
                    </td>
                    <td className="px-5 py-4">
                      {item.tracking_url ? (
                        <a
                          href={item.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-blue-600"
                        >
                          {item.tracking_number || "Track"}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {item.item_within_trial_period ? "Yes" : "No"}
                    </td>
                    <td className="px-5 py-4">
                      {item.local_order_id ? (
                        <Link
                          href={`/dashboard/orders/detail/?orderId=${item.local_order_id}`}
                          className="font-semibold text-blue-600"
                        >
                          Handle return
                        </Link>
                      ) : (
                        <span className="text-slate-400">
                          Order not synchronized
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? null : visibleReturns.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              No returns match your filters.
            </p>
          ) : (
            visibleReturns.map((item) => (
              <article
                key={`${item.marketplace_account}-${item.id}`}
                className="space-y-4 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      Order #{item.order_id}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {item.instance_name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {item.state.replaceAll("_", " ")}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Started</dt>
                    <dd className="mt-1 text-slate-700">
                      {formatOrderDateTime(item.return_initiated_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Trial period</dt>
                    <dd className="mt-1 text-slate-700">
                      {item.item_within_trial_period ? "Yes" : "No"}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-4 text-sm font-semibold">
                  {item.tracking_url && (
                    <a
                      href={item.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600"
                    >
                      Track return
                    </a>
                  )}
                  {item.local_order_id ? (
                    <Link
                      href={`/dashboard/orders/detail/?orderId=${item.local_order_id}`}
                      className="text-blue-600"
                    >
                      Handle return
                    </Link>
                  ) : (
                    <span className="font-normal text-slate-400">
                      Order not synchronized
                    </span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">{filtered.length} returns</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              disabled={page === pageCount}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
        {text}
      </td>
    </tr>
  );
}
