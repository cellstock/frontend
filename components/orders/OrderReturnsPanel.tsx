"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import {
  calculateOrderRefund,
  getOrderReturns,
  OrderReturn,
  OrdersApiError,
  RefundCalculation,
  refundOrder,
} from "@/lib/api/orders";
import {
  formatOrderCurrency,
  formatOrderDateTime,
} from "@/lib/orders/formatters";
import type { Order } from "@/types/order";

type PendingRefund = {
  itemId?: number;
  targetPaidAmount?: string;
  calculation: RefundCalculation;
};

export function OrderReturnsPanel({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: () => void;
}) {
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingRefund | null>(null);
  const [targets, setTargets] = useState<Record<number, string>>({});

  useEffect(() => {
    let active = true;

    getOrderReturns(order.id)
      .then((response) => {
        if (active) setReturns(response.data.returns);
      })
      .catch((caught) => {
        if (active) setError(apiMessage(caught, "Unable to load returns."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [order.id]);

  async function previewRefund(itemId?: number) {
    const targetPaidAmount = itemId ? targets[itemId]?.trim() : undefined;

    if (itemId && !targetPaidAmount) {
      setError("Enter the amount the customer should have paid after refund.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await calculateOrderRefund(order.id, {
        item_id: itemId,
        target_paid_amount: targetPaidAmount,
      });
      setPending({
        itemId,
        targetPaidAmount,
        calculation: response.data.refund,
      });
    } catch (caught) {
      setError(apiMessage(caught, "Unable to calculate this refund."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRefund() {
    if (!pending) return;
    setBusy(true);
    setError("");

    try {
      const response = await refundOrder(order.id, {
        item_id: pending.itemId,
        target_paid_amount: pending.targetPaidAmount,
      });
      setMessage(response.message);
      setPending(null);
      onUpdated();
    } catch (caught) {
      setError(apiMessage(caught, "Unable to complete this refund."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">
              Cancellations and returns
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Review Refurbed returns and issue full or item refunds.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void previewRefund()}
          className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          Preview full refund
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">State</th>
              <th className="px-3 py-3">Started</th>
              <th className="px-3 py-3">Tracking</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-slate-500">
                  Loading returns from Refurbed…
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-slate-500">
                  No return requests found for this order.
                </td>
              </tr>
            ) : (
              returns.map((itemReturn) => (
                <tr key={itemReturn.id}>
                  <td className="px-3 py-3 font-medium text-slate-800">
                    {itemReturn.instance_name}
                  </td>
                  <td className="px-3 py-3">
                    {itemReturn.state.replaceAll("_", " ")}
                  </td>
                  <td className="px-3 py-3">
                    {formatOrderDateTime(itemReturn.return_initiated_at)}
                  </td>
                  <td className="px-3 py-3">
                    {itemReturn.tracking_url ? (
                      <a
                        className="text-blue-600"
                        href={itemReturn.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {itemReturn.tracking_number || "Track return"}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-bold text-slate-900">
          Partial refund by item
        </h3>
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">
                {item.title}
              </p>
              <p className="text-xs text-slate-500">
                Current paid amount:{" "}
                {formatOrderCurrency(item.unit_price, item.currency)}
              </p>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={targets[item.id] ?? ""}
              onChange={(event) =>
                setTargets((current) => ({
                  ...current,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="Target paid amount"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void previewRefund(item.id)}
              className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
            >
              Preview refund
            </button>
          </div>
        ))}
      </div>

      {pending && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-slate-900">Confirm refund</h3>
          <p className="mt-2 text-sm text-slate-700">
            Refunded now:{" "}
            {formatOrderCurrency(
              pending.calculation.refunded,
              pending.calculation.currency_code,
            )}{" "}
            · New paid total:{" "}
            {formatOrderCurrency(
              pending.calculation.total_paid,
              pending.calculation.currency_code,
            )}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Refurbed requires a linked ticket. Refunded stock must be restocked
            manually.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPending(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmRefund()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Confirm refund
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function apiMessage(error: unknown, fallback: string) {
  return error instanceof OrdersApiError ? error.message : fallback;
}
