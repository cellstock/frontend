"use client";

import { useI18n } from "@/components/i18n/language-provider";
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  Package,
  PackageOpen,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "@/components/ui/AppLink";

import { OrderMarketplaceBadge } from "@/components/orders/OrderMarketplaceBadge";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderActionsMenu } from "@/components/orders/OrderActionsMenu";
import {
  formatCountryCode,
  formatOrderCurrency,
  formatOrderDateTime,
  formatPaymentMethod,
} from "@/lib/orders/formatters";
import type { Order, OrderItem } from "@/types/order";

interface OrderTableProps {
  orders: Order[];
  onUpdated?: () => Promise<void> | void;
}

export function OrderTable({ orders, onUpdated }: OrderTableProps) {
  const { t } = useI18n();

  if (orders.length === 0) return <OrdersEmptyState />;

  return (
    <section
      aria-labelledby="orders-results-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2
            id="orders-results-heading"
            className="text-base font-bold text-slate-900"
          >
            {t("Order results")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              "Customer, item, payment and delivery information for synchronized orders.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {orders.length} {t("shown")}
          </span>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1280px] table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr>
              <TableHeading className="w-[175px]">
                {t("Date & site")}
              </TableHeading>
              <TableHeading className="w-[335px]">
                {t("Order & item details")}
              </TableHeading>
              <TableHeading className="w-[230px]">
                {t("Customer & total")}
              </TableHeading>
              <TableHeading className="w-[205px]">
                {t("Status & payment")}
              </TableHeading>
              <TableHeading className="w-[260px]">{t("Delivery")}</TableHeading>
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
                onUpdated={onUpdated}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-200 lg:hidden">
        {orders.map((order) => (
          <MobileOrderCard key={order.id} order={order} onUpdated={onUpdated} />
        ))}
      </div>
    </section>
  );
}

function DesktopOrderRow({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated?: () => Promise<void> | void;
}) {
  const { t, locale } = useI18n();
  const primaryItem = order.items[0];
  const extraItemCount = Math.max(0, order.items.length - 1);

  return (
    <tr className="group align-top transition hover:bg-blue-50/30">
      <td className="px-5 py-5 sm:px-6">
        <p className="text-sm font-semibold leading-5 text-slate-800">
          {formatOrderDateTime(order.ordered_at, locale)}
        </p>
        <div className="mt-3">
          <OrderMarketplaceBadge marketplace={order.marketplace} compact />
        </div>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
          <MapPin className="h-3 w-3" /> {formatCountryCode(order.country_code)}
        </span>
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
        <DeliverySummary order={order} />
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
    <div className="mt-1.5 space-y-1 text-xs leading-4 text-slate-500">
      <p className="line-clamp-2 font-semibold text-slate-800">
        {item.title || t("Untitled item")}
      </p>
      <p>
        {t("Qty")}: {item.quantity} ·{" "}
        {formatOrderCurrency(item.unit_price, item.currency, locale)}
      </p>
      {item.sku && (
        <p>
          {t("SKU")}:{" "}
          <span className="font-medium text-slate-700">{item.sku}</span>
        </p>
      )}
      {item.condition && (
        <p>
          {t("Condition")}: {item.condition}
        </p>
      )}
    </div>
  );
}

function DeliverySummary({ order }: { order: Order }) {
  const { t } = useI18n();
  const trackingUrl = safeExternalUrl(order.tracking_url);
  return (
    <div className="space-y-2.5 text-xs">
      <p className="flex items-center gap-2 font-semibold text-slate-800">
        <Truck className="h-4 w-4 text-slate-400" />
        {order.shipper || t("Carrier not assigned")}
      </p>
      <p className="text-slate-500">
        <span className="font-medium text-slate-700">
          {t("Tracking number")}:
        </span>{" "}
        {order.tracking_number || t("Not available")}
      </p>
      {trackingUrl ? (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-blue-600 transition hover:text-blue-700"
        >
          {t("Open tracking")} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <p className="text-slate-400">{t("Tracking link unavailable")}</p>
      )}
    </div>
  );
}

function MobileOrderCard({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated?: () => Promise<void> | void;
}) {
  const { t, locale } = useI18n();
  const primaryItem = order.items[0];
  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-4">
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
