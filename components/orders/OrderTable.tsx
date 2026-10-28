"use client";

import { useI18n } from "@/components/i18n/language-provider";
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Mail,
  Package,
  PackageOpen,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "@/components/ui/AppLink";
import { useEffect, useMemo, useState } from "react";

import { OrderMarketplaceBadge } from "@/components/orders/OrderMarketplaceBadge";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderActionsMenu } from "@/components/orders/OrderActionsMenu";
import { OrderBulkActions } from "@/components/orders/OrderBulkActions";
import {
  OrdersApiError,
  updateOrderEditFields,
} from "@/lib/api/orders";
import {
  formatCountryCode,
  formatOrderCurrency,
  formatOrderDateTime,
  formatPaymentMethod,
} from "@/lib/orders/formatters";
import type { Order, OrderItem } from "@/types/order";

const CARRIER_OPTIONS = [
  "DHL Express",
  "DHL",
  "UPS",
  "FedEx",
  "DPD",
  "GLS",
  "PostNL",
  "Chronopost",
  "Colissimo",
  "Custom shipper",
] as const;

type CarrierOption = (typeof CARRIER_OPTIONS)[number];

/** Set to true to show bulk checkboxes + "Select an action" again. */
const SHOW_ORDER_BULK_ACTIONS = false;

interface OrderTableProps {
  orders: Order[];
  onUpdated?: () => Promise<void> | void;
}

export function OrderTable({ orders, onUpdated }: OrderTableProps) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const orderIdsKey = orders.map((order) => order.id).join(",");

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => orders.some((order) => order.id === id)),
    );
  }, [orderIdsKey, orders]);

  const allSelected =
    orders.length > 0 && orders.every((order) => selectedIds.includes(order.id));
  const someSelected =
    selectedIds.length > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? orders.map((order) => order.id) : []);
  }

  function toggleOne(orderId: number, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(orderId)
          ? current
          : [...current, orderId]
        : current.filter((id) => id !== orderId),
    );
  }

  if (orders.length === 0) return <OrdersEmptyState />;

  return (
    <section
      aria-labelledby="orders-results-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {SHOW_ORDER_BULK_ACTIONS ? (
            <OrderBulkActions
              orders={orders}
              selectedIds={selectedIds}
              onFeedback={setFeedback}
              onUpdated={onUpdated}
              onClearSelection={() => setSelectedIds([])}
            />
          ) : null}
          <div>
            <h2
              id="orders-results-heading"
              className="text-base font-bold text-slate-900"
            >
              {t("Order results")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {SHOW_ORDER_BULK_ACTIONS && selectedIds.length > 0
                ? t(`${selectedIds.length} selected`)
                : t(
                    "Customer, item, payment and delivery information for synchronized orders.",
                  )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {orders.length} {t("shown")}
          </span>
        </div>
      </div>

      {SHOW_ORDER_BULK_ACTIONS && feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`border-b px-5 py-3 text-sm font-medium sm:px-6 ${
            feedback.kind === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1440px] table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr>
              {SHOW_ORDER_BULK_ACTIONS ? (
                <TableHeading className="w-[48px]">
                  <span className="sr-only">{t("Select all")}</span>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = someSelected;
                    }}
                    onChange={(event) => toggleAll(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label={t("Select all orders")}
                  />
                </TableHeading>
              ) : null}
              <TableHeading className="w-[175px]">
                {t("Date & site")}
              </TableHeading>
              <TableHeading className="w-[380px]">
                {t("Order & item details")}
              </TableHeading>
              <TableHeading className="w-[230px]">
                {t("Customer & total")}
              </TableHeading>
              <TableHeading className="w-[205px]">
                {t("Status & payment")}
              </TableHeading>
              <TableHeading className="w-[340px]">
                {t("Delivery options")}
              </TableHeading>
              <TableHeading className="sticky right-0 z-20 w-[130px] bg-slate-50 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">
                {t("Actions")}
              </TableHeading>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {orders.map((order) => (
              <DesktopOrderRow
                key={order.id}
                order={order}
                showCheckbox={SHOW_ORDER_BULK_ACTIONS}
                selected={selectedIds.includes(order.id)}
                onSelectedChange={(checked) => toggleOne(order.id, checked)}
                onUpdated={onUpdated}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-200 lg:hidden">
        {orders.map((order) => (
          <MobileOrderCard
            key={order.id}
            order={order}
            showCheckbox={SHOW_ORDER_BULK_ACTIONS}
            selected={selectedIds.includes(order.id)}
            onSelectedChange={(checked) => toggleOne(order.id, checked)}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </section>
  );
}

function DesktopOrderRow({
  order,
  showCheckbox,
  selected,
  onSelectedChange,
  onUpdated,
}: {
  order: Order;
  showCheckbox: boolean;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onUpdated?: () => Promise<void> | void;
}) {
  const { t, locale } = useI18n();
  const primaryItem = order.items[0];
  const extraItemCount = Math.max(0, order.items.length - 1);

  return (
    <tr
      className={`group align-top transition hover:bg-blue-50/30 ${
        showCheckbox && selected ? "bg-blue-50/40" : ""
      }`}
    >
      {showCheckbox ? (
        <td className="px-4 py-5 sm:px-5">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            aria-label={t(`Select order #${order.external_order_id}`)}
          />
        </td>
      ) : null}
      <td className="px-5 py-5 sm:px-6">
        <p className="text-sm font-semibold leading-5 text-slate-800">
          {formatOrderDateTime(order.ordered_at, locale)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <OrderMarketplaceBadge marketplace={order.marketplace} compact />
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
            title={`${order.marketplace.name} · ${formatCountryCode(order.country_code)}`}
          >
            <span className="text-base leading-none" aria-hidden="true">
              {countryFlag(order.country_code)}
            </span>
            {formatCountryCode(order.country_code)}
          </span>
        </div>
      </td>

      <td className="px-5 py-5 sm:px-6">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <Link
              href={`/dashboard/orders/detail/?orderId=${order.id}`}
              className="font-bold text-blue-600 transition hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              #{order.external_order_id}
            </Link>
            {primaryItem ? (
              <ItemSummary item={primaryItem} />
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                {t("No item details available")}
              </p>
            )}
            {extraItemCount > 0 && (
              <p className="mt-2 text-xs font-semibold text-blue-600">
                +{extraItemCount}{" "}
                {extraItemCount === 1
                  ? t("additional item")
                  : t("additional items")}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-5 sm:px-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserRound className="h-4 w-4 text-slate-400" />
          {order.customer.name || t("Customer unavailable")}
        </p>
        {order.customer.email && (
          <p className="mt-2 flex items-center gap-2 break-all text-xs text-slate-500">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {order.customer.email}
          </p>
        )}
        <p className="mt-3 text-lg font-bold text-slate-950">
          {formatOrderCurrency(order.total_amount, order.currency, locale)}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {t("Tax")}{" "}
          {formatOrderCurrency(order.tax_amount, order.currency, locale)}
        </p>
      </td>

      <td className="px-5 py-5 sm:px-6">
        <OrderStatusBadge status={order.status} />
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <CreditCard className="h-3.5 w-3.5" />
          {formatPaymentMethod(order.payment_method, locale)}
        </p>
        <p
          className={`mt-3 flex items-center gap-2 text-sm font-semibold ${order.payment.is_paid ? "text-emerald-700" : "text-amber-700"}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${order.payment.is_paid ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          {order.payment.is_paid ? t("Paid") : t("Payment pending")}
        </p>
        {order.last_synced_at && (
          <p className="mt-2 text-[11px] leading-4 text-slate-400">
            {t("Synced")} {formatOrderDateTime(order.last_synced_at, locale)}
          </p>
        )}
      </td>

      <td className="px-5 py-5 sm:px-6">
        <DeliverySummary order={order} onUpdated={onUpdated} />
      </td>
      <td className="sticky right-0 z-10 bg-white px-4 py-5 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] transition group-hover:bg-blue-50">
        <OrderActionsMenu order={order} onUpdated={onUpdated} />
      </td>
    </tr>
  );
}

function ItemSummary({ item }: { item: OrderItem }) {
  const { t, locale } = useI18n();
  return (
    <div className="mt-1.5 space-y-1 text-xs leading-5 text-slate-500">
      <p className="whitespace-normal break-words font-semibold text-blue-600">
        {item.title || t("Untitled item")}
      </p>
      <p>
        {t("Qty")}: {item.quantity} / {t("Item price")}:{" "}
        {formatOrderCurrency(item.unit_price, item.currency, locale)}
      </p>
      <p>
        {t("Category")}:{" "}
        <span className="font-medium text-slate-700">
          {item.category?.trim() || t("Not available")}
        </span>
      </p>
      <p>
        {t("SKU")}:{" "}
        <span className="break-all font-medium text-slate-700">
          {item.sku?.trim() || t("Not available")}
        </span>
      </p>
      <p>
        {t("EAN")}:{" "}
        <span className="break-all font-medium text-slate-700">
          {item.ean?.trim() || t("Not available")}
        </span>
      </p>
    </div>
  );
}

function DeliverySummary({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated?: () => Promise<void> | void;
}) {
  const { t } = useI18n();
  const trackingUrl = safeExternalUrl(order.tracking_url);
  const shippingType = (() => {
    const raw = order.shipping_type?.trim();
    if (raw && raw.toLowerCase() !== "standard") return raw;
    if (order.marketplace.slug.startsWith("back-market")) return "Backship";
    return null;
  })();
  const initialCarrier = order.shipper?.trim() || "";
  const knownCarrier = CARRIER_OPTIONS.find(
    (option) =>
      option !== "Custom shipper" &&
      option.toLowerCase() === initialCarrier.toLowerCase(),
  );

  const [editing, setEditing] = useState(false);
  const [carrierChoice, setCarrierChoice] = useState<CarrierOption>(
    knownCarrier || (initialCarrier ? "Custom shipper" : "DHL Express"),
  );
  const [customCarrier, setCustomCarrier] = useState(
    knownCarrier ? "" : initialCarrier,
  );
  const [trackingNumber, setTrackingNumber] = useState(
    order.tracking_number?.trim() || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) return;
    const nextCarrier = order.shipper?.trim() || "";
    const known = CARRIER_OPTIONS.find(
      (option) =>
        option !== "Custom shipper" &&
        option.toLowerCase() === nextCarrier.toLowerCase(),
    );
    setCarrierChoice(known || (nextCarrier ? "Custom shipper" : "DHL Express"));
    setCustomCarrier(known ? "" : nextCarrier);
    setTrackingNumber(order.tracking_number?.trim() || "");
  }, [order.shipper, order.tracking_number, editing]);

  const displayCarrier = useMemo(() => {
    if (carrierChoice === "Custom shipper") {
      return customCarrier.trim() || t("Not available");
    }
    return carrierChoice;
  }, [carrierChoice, customCarrier, t]);

  function startEdit() {
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    const nextCarrier = order.shipper?.trim() || "";
    const known = CARRIER_OPTIONS.find(
      (option) =>
        option !== "Custom shipper" &&
        option.toLowerCase() === nextCarrier.toLowerCase(),
    );
    setCarrierChoice(known || (nextCarrier ? "Custom shipper" : "DHL Express"));
    setCustomCarrier(known ? "" : nextCarrier);
    setTrackingNumber(order.tracking_number?.trim() || "");
    setError("");
    setEditing(false);
  }

  async function saveDelivery() {
    const shipper =
      carrierChoice === "Custom shipper"
        ? customCarrier.trim()
        : carrierChoice;
    if (!shipper) {
      setError(t("Enter a shipping carrier."));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await updateOrderEditFields(order.id, {
        shipper,
        tracking_number: trackingNumber.trim() || null,
      });
      setEditing(false);
      await onUpdated?.();
    } catch (caught) {
      setError(
        caught instanceof OrdersApiError
          ? caught.message
          : t("Unable to save delivery options."),
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "block h-8 w-[7.5rem] truncate rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 text-xs leading-4 text-slate-700";
  const inputClass =
    "block h-8 w-[7.5rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs leading-4 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-2 text-xs text-slate-600">
      {shippingType && (
        <div className="flex items-center gap-2">
          <p className="w-[7.25rem] shrink-0 font-medium text-slate-700">
            {t("Shipping type")}
          </p>
          <p className="truncate text-slate-800">{shippingType}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <p className="w-[7.25rem] shrink-0 font-medium text-slate-700">
          {t("Shipping carrier")}
        </p>
        {editing ? (
          <div className="flex min-w-0 flex-col gap-1">
            <select
              value={carrierChoice}
              onChange={(event) =>
                setCarrierChoice(event.target.value as CarrierOption)
              }
              className={inputClass}
            >
              {CARRIER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "Custom shipper"
                    ? t("Custom shipper")
                    : option}
                </option>
              ))}
            </select>
            {carrierChoice === "Custom shipper" && (
              <input
                value={customCarrier}
                onChange={(event) => setCustomCarrier(event.target.value)}
                placeholder={t("Carrier name")}
                className={inputClass}
              />
            )}
          </div>
        ) : (
          <p className={fieldClass} title={displayCarrier}>
            {displayCarrier}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <p className="w-[7.25rem] shrink-0 pt-1.5 font-medium text-slate-700">
          {t("Tracking number")}
        </p>
        <div className="min-w-0">
          {editing ? (
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder={t("Tracking number")}
              className={`${inputClass} break-all`}
            />
          ) : (
            <p
              className={fieldClass}
              title={order.tracking_number?.trim() || undefined}
            >
              {order.tracking_number?.trim() || ""}
            </p>
          )}
          {!editing &&
            (trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-semibold text-blue-600 transition hover:text-blue-700"
              >
                {t("Open tracking")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-1 text-slate-400">
                {t("Tracking link unavailable")}
              </p>
            ))}
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={cancelEdit}
            className="rounded-full border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={saveDelivery}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? t("Saving…") : t("Save")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="rounded-full border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
        >
          {t("Modify")}
        </button>
      )}
    </div>
  );
}

function MobileOrderCard({
  order,
  showCheckbox,
  selected,
  onSelectedChange,
  onUpdated,
}: {
  order: Order;
  showCheckbox: boolean;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onUpdated?: () => Promise<void> | void;
}) {
  const { t, locale } = useI18n();
  const primaryItem = order.items[0];
  return (
    <article
      className={`p-5 ${showCheckbox && selected ? "bg-blue-50/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {showCheckbox ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelectedChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              aria-label={t(`Select order #${order.external_order_id}`)}
            />
          ) : null}
          <div>
            <Link
              href={`/dashboard/orders/detail/?orderId=${order.id}`}
              className="font-bold text-blue-600 hover:text-blue-700"
            >
              #{order.external_order_id}
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              {formatOrderDateTime(order.ordered_at, locale)}
            </p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-4">
        <OrderMarketplaceBadge marketplace={order.marketplace} compact />
      </div>
      {primaryItem && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <ItemSummary item={primaryItem} />
        </div>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <MobileOrderValue
          icon={UserRound}
          label={t("Customer")}
          value={order.customer.name || t("Unavailable")}
        />
        <MobileOrderValue
          icon={CreditCard}
          label={t("Total")}
          value={formatOrderCurrency(
            order.total_amount,
            order.currency,
            locale,
          )}
        />
        <MobileOrderValue
          icon={CheckCircle2}
          label={t("Payment")}
          value={order.payment.is_paid ? t("Paid") : t("Pending")}
        />
        <MobileOrderValue
          icon={Truck}
          label={t("Carrier")}
          value={order.shipper || t("Not assigned")}
        />
      </dl>
      <Link
        href={`/dashboard/orders/detail/?orderId=${order.id}`}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        {t("View order")} <ArrowUpRight className="h-4 w-4" />
      </Link>
      <div className="mt-3 flex justify-end">
        <OrderActionsMenu order={order} onUpdated={onUpdated} />
      </div>
    </article>
  );
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function countryFlag(code: string | null | undefined): string {
  const normalized = String(code ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (!/^[A-Z]{2}$/.test(normalized)) return "•";
  return String.fromCodePoint(
    ...[...normalized].map((character) => 127397 + character.charCodeAt(0)),
  );
}

function TableHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 sm:px-6 ${className}`}
    >
      {children}
    </th>
  );
}

function MobileOrderValue({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-700">{value}</dd>
    </div>
  );
}

function OrdersEmptyState() {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-lg font-bold text-slate-900">
        {t("No orders found")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {t(
          "No orders match the selected filters. Try removing one or more filters or synchronize your connected marketplaces.",
        )}
      </p>
    </section>
  );
}
