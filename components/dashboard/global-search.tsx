"use client";

import {
  ArrowRight,
  Boxes,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/AppLink";
import { useI18n } from "@/components/i18n/language-provider";
import { getOrders } from "@/lib/api/orders";
import { getInventory } from "@/lib/api/inventory";
import type { Order } from "@/types/order";
import type { InventoryOffer } from "@/types/inventory";

const destinations = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Orders", "/dashboard/orders", ShoppingBag],
  ["Inventory", "/dashboard/inventory", Boxes],
  ["Marketplaces", "/dashboard/marketplaces", Store],
] as const;

export function GlobalSearch() {
  const { t } = useI18n();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<InventoryOffer[]>([]);
  const normalized = query.trim().toLowerCase();
  const pages = normalized
    ? destinations.filter(([name]) => name.toLowerCase().includes(normalized))
    : destinations;

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setOrders([]);
        setOffers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      void Promise.allSettled([
        getOrders(
          { search: query.trim(), page: 1, per_page: 5 },
          controller.signal,
        ),
        getInventory({ search: query.trim(), page: 1, limit: 5 }),
      ]).then(([orderResult, inventoryResult]) => {
        if (controller.signal.aborted) return;
        setOrders(
          orderResult.status === "fulfilled" ? orderResult.value.data : [],
        );
        setOffers(
          inventoryResult.status === "fulfilled"
            ? inventoryResult.value.data.offers
            : [],
        );
        setLoading(false);
      });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    openMatchingOrders();
  }

  function openMatchingOrders() {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/dashboard/orders?search=${encodeURIComponent(query.trim())}`);
  }

  const hasResults = pages.length > 0 || orders.length > 0 || offers.length > 0;
  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={submit}>
        <label
          className={`relative block rounded-xl transition-all duration-200 ${open ? "ring-4 ring-blue-100" : ""}`}
        >
          <span className="sr-only">{t("Search")}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            placeholder={t("Search orders, inventory or pages...")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
          />
          {query && (
            <button
              type="button"
              aria-label={t("Clear search")}
              onClick={() => {
                setQuery("");
                setOrders([]);
                setOffers([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </form>
      <div
        aria-hidden={!open}
        className={`absolute left-0 right-0 top-14 z-[70] origin-top overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-all duration-200 ${open ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none invisible -translate-y-2 scale-[.98] opacity-0"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
            {query ? t("Search results") : t("Quick navigation")}
          </p>
          {loading && (
            <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
          )}
        </div>
        <div className="max-h-[min(65vh,480px)] overflow-y-auto p-2">
          {pages.length > 0 && (
            <SearchSection title="Pages">
              {pages.map(([name, href, Icon]) => (
                <ResultLink
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  icon={<Icon className="h-4 w-4" />}
                  title={t(name)}
                  detail={t("Open page")}
                />
              ))}
            </SearchSection>
          )}
          {orders.length > 0 && (
            <SearchSection title="Orders">
              {orders.map((order) => (
                <ResultLink
                  key={order.id}
                  href={`/dashboard/orders/detail/?orderId=${order.id}`}
                  onClick={() => setOpen(false)}
                  icon={<FileText className="h-4 w-4" />}
                  title={`#${order.external_order_id}`}
                  detail={`${order.customer.name ?? t("Unknown customer")} · ${order.total_amount} ${order.currency}`}
                />
              ))}
            </SearchSection>
          )}
          {offers.length > 0 && (
            <SearchSection title="Inventory">
              {offers.map((offer) => (
                <ResultLink
                  key={offer.id}
                  href={`/dashboard/inventory?search=${encodeURIComponent(offer.sku)}`}
                  onClick={() => setOpen(false)}
                  icon={<Boxes className="h-4 w-4" />}
                  title={offer.instance_name || offer.sku}
                  detail={`${t("SKU")}: ${offer.sku} · ${t("Stock")}: ${offer.stock}`}
                />
              ))}
            </SearchSection>
          )}
          {!loading && query.trim().length >= 2 && !hasResults && (
            <div className="px-5 py-10 text-center">
              <Search className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {t("No results found")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t("Try a different order number, customer, SKU or page name.")}
              </p>
            </div>
          )}
          {query.trim().length === 1 && (
            <p className="px-4 py-6 text-center text-xs text-slate-400">
              {t("Enter at least two characters to search data.")}
            </p>
          )}
        </div>
        {query.trim() && (
          <button
            type="button"
            onClick={openMatchingOrders}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            {t("View all matching orders")}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SearchSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="mb-2 last:mb-0">
      <h2 className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">
        {t(title)}
      </h2>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}
function ResultLink({
  href,
  icon,
  title,
  detail,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-blue-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-700">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">
          {title}
        </span>
        <span className="block truncate text-xs text-slate-400">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
    </Link>
  );
}
