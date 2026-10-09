"use client";
import { useI18n } from "@/components/i18n/language-provider";
import { ArrowRight, ShoppingBag } from "lucide-react";
import Link from "@/components/ui/AppLink";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import {
  formatOrderCurrency,
  formatOrderDateTime,
} from "@/lib/orders/formatters";
import type { Order } from "@/types/order";

export function RecentOrders({ orders }: { orders: Order[] }) {
  const { t, locale } = useI18n();
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-bold text-slate-900">{t("Recent orders")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("Latest orders across your marketplaces")}
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("View all")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            {t("No synchronized orders yet")}
          </p>
          <Link
            href="/dashboard/marketplaces"
            className="mt-3 inline-block text-sm font-semibold text-blue-600"
          >
            {t("Connect or sync a marketplace")}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Order", "Marketplace", "Amount", "Status"].map((label) => (
                  <th
                    scope="col"
                    key={t(label)}
                    className="px-5 py-3.5 font-semibold"
                  >
                    {t(label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/orders/detail/?orderId=${order.id}`}
                      className="text-sm font-semibold text-slate-800 hover:text-blue-600"
                    >
                      #{order.external_order_id}
                    </Link>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatOrderDateTime(order.ordered_at, locale)}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <Link
                      href={`/dashboard/marketplaces/detail/?slug=${encodeURIComponent(order.marketplace.slug)}`}
                      className="text-slate-600 hover:text-blue-600"
                    >
                      {order.marketplace.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                    {order.currency
                      ? formatOrderCurrency(
                          order.total_amount,
                          order.currency,
                          locale,
                        )
                      : `${order.total_amount} (currency unavailable)`}
                  </td>
                  <td className="px-5 py-4">
                    <OrderStatusBadge status={order.status || "unknown"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
