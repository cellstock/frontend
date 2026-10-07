"use client";
import { useI18n } from "@/components/i18n/language-provider";
import {
  Box,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  FileText,
  Download,
  ImageIcon,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { OrderMarketplaceBadge } from "@/components/orders/OrderMarketplaceBadge";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import {
  formatOrderCurrency,
  formatOrderDateTime,
  formatPaymentMethod,
} from "@/lib/orders/formatters";
import type {
  OrderDetails as OrderDetailsType,
  OrderItem,
} from "@/types/order";
import {
  getRefurbedOrderInvoice,
  OrdersApiError,
  refreshOrderFromRefurbed,
  updateOrderItemShipping,
} from "@/lib/api/orders";
import { OrderActionsMenu } from "@/components/orders/OrderActionsMenu";
import { OrderEditSections } from "@/components/orders/OrderEditSections";
import { OrderReturnsPanel } from "@/components/orders/OrderReturnsPanel";

interface OrderDetailsProps {
  order: OrderDetailsType;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshOrder() {
    setBusy(true);
    setMessage("");
    try {
      const response = await refreshOrderFromRefurbed(order.id);
      setMessage(response.message ?? "Order synchronized from Refurbed.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof OrdersApiError
          ? error.message
          : "Unable to synchronize this order.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openInvoice() {
    setBusy(true);
    setMessage("");
    try {
      const response = await getRefurbedOrderInvoice(order.id);
      if (response.data.url) {
        window.open(response.data.url, "_blank", "noopener,noreferrer");
      } else {
        setMessage(response.message ?? "Invoice preparation has started.");
      }
    } catch (error) {
      setMessage(
        error instanceof OrdersApiError
          ? error.message
          : "No Refurbed invoice is available.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <OrderHeader order={order} />

      {order.marketplace.slug === "refurbed" && (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Refurbed order controls
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Status, tracking and remote order data stay synchronized with
              Refurbed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => void refreshOrder()}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              Synchronize
            </button>
            <button
              disabled={busy}
              onClick={() => void openInvoice()}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Open invoice
            </button>
            <OrderActionsMenu
              order={order}
              showViewOrder={false}
              onUpdated={() => {
                router.refresh();
              }}
            />
          </div>
        </section>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800"
        >
          {message}
        </p>
      )}
      {order.shipping_labels.length > 0 && (
        <ShippingLabels labels={order.shipping_labels} />
      )}
      {order.marketplace.slug === "refurbed" && (
        <OrderReturnsPanel order={order} onUpdated={() => router.refresh()} />
      )}
      <OrderEditSections
        order={order}
        onRefresh={() => router.refresh()}
        onInvoice={() => void openInvoice()}
        orderedItems={
          <OrderItems order={order} onUpdated={() => router.refresh()} />
        }
      />
    </div>
  );
}

function ShippingLabels({
  labels,
}: {
  labels: OrderDetailsType["shipping_labels"];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">Shipping labels</h2>
      <div className="mt-4 space-y-3">
        {labels.map((label) => {
          const downloadUrl =
            label.label_printer_url ||
            label.normal_printer_urls.top_left ||
            label.normal_printer_urls.top_right ||
            label.normal_printer_urls.bottom_left ||
            label.normal_printer_urls.bottom_right;

          return (
            <div
              key={label.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  {label.carrier || "Shipping label"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Tracking: {label.tracking_number || "Pending"}
                  {label.parcel_weight ? ` · ${label.parcel_weight} kg` : ""}
                </p>
              </div>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4" />
                  Download label
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrderHeader({ order }: OrderDetailsProps) {
  const { t, locale } = useI18n();
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t("Order #")}
                {order.external_order_id}
              </h1>

              <OrderStatusBadge status={order.status} />
            </div>

            <div className="mt-5">
              <OrderMarketplaceBadge marketplace={order.marketplace} />
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <HeaderValue
              icon={CalendarClock}
              label={t("Ordered")}
              value={formatOrderDateTime(order.ordered_at, locale)}
            />

            <HeaderValue
              icon={RefreshCw}
              label={t("Last synchronized")}
              value={formatOrderDateTime(order.last_synced_at, locale)}
            />

            <HeaderValue
              icon={CreditCard}
              label={t("Payment")}
              value={formatPaymentMethod(order.payment_method)}
            />

            <HeaderValue
              icon={CircleDollarSign}
              label={t("Order total")}
              value={formatOrderCurrency(
                order.total_amount,
                order.currency,
                locale,
              )}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

function HeaderValue({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
        <Icon className="h-4 w-4" />
        {t(label)}
      </dt>

      <dd className="mt-2 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function OrderItems({
  order,
  onUpdated,
}: {
  order: OrderDetailsType;
  onUpdated: () => void;
}) {
  const { t, locale } = useI18n();
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [shippingAmount, setShippingAmount] = useState("");
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [error, setError] = useState("");

  function editShipping(item: OrderItem) {
    setEditingItem(item.id);
    setShippingAmount(item.shipping_amount);
    setError("");
  }
  async function saveShipping(item: OrderItem) {
    setBusyItem(item.id);
    setError("");
    try {
      await updateOrderItemShipping(order.id, item.id, shippingAmount);
      setEditingItem(null);
      onUpdated();
    } catch (caught) {
      setError(
        caught instanceof OrdersApiError
          ? caught.message
          : "Unable to update the shipping cost.",
      );
    } finally {
      setBusyItem(null);
    }
  }

  return (
    <section
      aria-labelledby="order-items-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
        <div>
          <h2
            id="order-items-heading"
            className="text-base font-bold text-slate-900"
          >
            {t("Ordered items")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("Products included in this marketplace order.")}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {order.items.length}{" "}
          {order.items.length === 1 ? t("item") : t("items")}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {order.items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Box className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {t("No order items available")}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[1120px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <ItemHeading>Position</ItemHeading>
                  <ItemHeading>Title</ItemHeading>
                  <ItemHeading>References</ItemHeading>
                  <ItemHeading>Condition / category</ItemHeading>
                  <ItemHeading align="right">Quantity</ItemHeading>
                  <ItemHeading align="right">Shipping costs</ItemHeading>
                  <ItemHeading align="right">Total</ItemHeading>
                  <ItemHeading align="right">Commission</ItemHeading>
                  <ItemHeading align="right">Actions</ItemHeading>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="align-middle hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-5 text-center">
                      <span className="mb-2 block text-xs text-slate-400">
                        {index + 1}
                      </span>
                      <span className="inline-flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400">
                        <ImageIcon className="h-6 w-6" />
                      </span>
                    </td>
                    <td className="min-w-72 px-5 py-5">
                      <p className="font-semibold text-blue-600">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm italic text-slate-500">
                        Weight: {item.weight_kg ?? "N/A"} kg, Length: N/A,
                        Height: N/A, width: N/A
                      </p>
                      {Number(order.payment.discount_amount ?? 0) > 0 && (
                        <p className="text-sm italic text-slate-500">
                          Discounts and reimbursements:{" "}
                          {formatOrderCurrency(
                            order.payment.discount_amount ?? "0",
                            order.currency,
                            locale,
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-5 text-sm text-slate-800">
                      <p>SKU: {item.sku || "-"}</p>
                      <p className="mt-1">EAN: {item.ean || "-"}</p>
                    </td>
                    <td className="px-5 py-5 text-sm text-slate-800">
                      <p className="capitalize">
                        {item.condition || "Unreferenced"}
                      </p>
                      <p className="mt-1">Unreferenced</p>
                    </td>
                    <td className="px-5 py-5 text-right text-sm font-semibold">
                      {item.quantity}
                    </td>
                    <td className="px-5 py-5 text-right text-sm">
                      <p>
                        {formatOrderCurrency(
                          item.shipping_amount,
                          item.currency || order.currency,
                          locale,
                        )}
                      </p>
                      {editingItem === item.id ? (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <input
                            aria-label="Shipping cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={shippingAmount}
                            onChange={(event) =>
                              setShippingAmount(event.target.value)
                            }
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right"
                          />
                          <button
                            type="button"
                            disabled={busyItem === item.id}
                            onClick={() => void saveShipping(item)}
                            className="rounded-lg bg-blue-600 p-2 text-white"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => editShipping(item)}
                          className="mt-2 text-sm font-semibold text-blue-600"
                        >
                          Change
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-5 text-right text-sm font-semibold">
                      {formatOrderCurrency(
                        Number(item.unit_price) * item.quantity +
                          Number(item.shipping_amount),
                        item.currency || order.currency,
                        locale,
                      )}
                    </td>
                    <td className="px-5 py-5 text-right text-sm">
                      {formatOrderCurrency(
                        item.commission_amount,
                        item.currency || order.currency,
                        locale,
                      )}
                    </td>
                    <td className="px-5 py-5 text-right">
                      <button
                        type="button"
                        aria-label={`Edit shipping cost for ${item.title}`}
                        onClick={() => editShipping(item)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 lg:hidden">
            {order.items.map((item) => (
              <div key={item.id}>
                <OrderItemCard item={item} />
                <div className="flex items-center gap-2 px-5 pb-5">
                  <span className="text-sm text-slate-500">
                    Shipping:{" "}
                    {formatOrderCurrency(
                      item.shipping_amount,
                      item.currency || order.currency,
                      locale,
                    )}
                  </span>
                  {editingItem === item.id ? (
                    <>
                      <input
                        aria-label="Shipping cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={shippingAmount}
                        onChange={(event) =>
                          setShippingAmount(event.target.value)
                        }
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => void saveShipping(item)}
                        className="rounded-lg bg-blue-600 p-2 text-white"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => editShipping(item)}
                      className="ml-auto text-sm font-semibold text-blue-600"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ItemHeading({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 sm:px-6 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function OrderItemCard({ item }: { item: OrderItem }) {
  const { t, locale } = useI18n();
  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-6 text-slate-900">
            {item.title}
          </h3>

          <p className="mt-1 text-xs text-slate-400">{item.sku}</p>
        </div>

        <OrderStatusBadge status={item.status} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <SmallValue label={t("Quantity")} value={String(item.quantity)} />

        <SmallValue
          label={t("Unit price")}
          value={formatOrderCurrency(item.unit_price, item.currency, locale)}
        />

        <SmallValue
          label={t("Commission")}
          value={formatOrderCurrency(
            item.commission_amount,
            item.currency,
            locale,
          )}
        />

        <SmallValue
          label={t("Condition")}
          value={item.condition || "Not available"}
        />
      </dl>

      {(item.return_reason || item.return_message) && (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />

          <div>
            {item.return_reason && (
              <p className="font-semibold">{item.return_reason}</p>
            )}

            {item.return_message && (
              <p className="mt-1">{item.return_message}</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function SmallValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold capitalize text-slate-700">
        {value}
      </dd>
    </div>
  );
}
