"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { Filter, RotateCcw, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { OrderFilterOption } from "@/types/order";

interface OrderFiltersProps {
  marketplaceOptions: OrderFilterOption[];
  disabled?: boolean;
}

const statusOptions: OrderFilterOption[] = [
  { label: "New", value: "NEW" },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
];

const pageSizeOptions = [10, 20, 50, 100];

export function OrderFilters({
  marketplaceOptions,
  disabled = false,
}: OrderFiltersProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const [countryCode, setCountryCode] = useState(
    searchParams.get("country_code") ?? "",
  );

  const queryString = searchParams.toString();
  const [previousQuery, setPreviousQuery] = useState(queryString);

  if (previousQuery !== queryString) {
    setPreviousQuery(queryString);
    setSearch(searchParams.get("search") ?? "");
    setCountryCode(searchParams.get("country_code") ?? "");
  }

  function navigateWithParameters(updates: Record<string, string | null>) {
    const parameters = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value?.trim()) {
        parameters.set(key, value.trim());
      } else {
        parameters.delete(key);
      }
    }

    parameters.delete("page");

    const queryString = parameters.toString();

    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    if (nextUrl !== window.location.pathname + window.location.search) {
      window.history.pushState(null, "", nextUrl);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    navigateWithParameters({
      search,
      country_code: countryCode.toUpperCase(),
    });
  }

  function handleReset() {
    setSearch("");
    setCountryCode("");

    if (window.location.search) {
      window.history.pushState(null, "", pathname);
    }
  }

  const hasActiveFilters =
    Boolean(searchParams.get("search")) ||
    Boolean(searchParams.get("marketplace")) ||
    Boolean(searchParams.get("status")) ||
    Boolean(searchParams.get("country_code")) ||
    Boolean(searchParams.get("per_page"));

  const isDisabled = disabled;

  return (
    <section
      aria-labelledby="order-filters-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Filter className="h-4 w-4" />
          </div>

          <div>
            <h2
              id="order-filters-heading"
              className="text-sm font-bold text-slate-900"
            >
              {t("Filter orders")}
            </h2>

            <p className="text-xs text-slate-500">
              {t("Find orders using marketplace and order data.")}
            </p>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {t("Clear filters")}
          </button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_1fr_1fr_140px_120px_auto]"
      >
        <div>
          <label
            htmlFor="order-search"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            {t("Order search")}
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="order-search"
              type="search"
              value={search}
              disabled={isDisabled}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search order ID")}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="order-marketplace"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            {t("Marketplace")}
          </label>

          <select
            id="order-marketplace"
            value={searchParams.get("marketplace") ?? ""}
            disabled={isDisabled}
            onChange={(event) =>
              navigateWithParameters({
                marketplace: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">{t("All marketplaces")}</option>

            {marketplaceOptions.map((marketplace) => (
              <option key={marketplace.value} value={marketplace.value}>
                {marketplace.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="order-status"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            {t("Status")}
          </label>

          <select
            id="order-status"
            value={searchParams.get("status") ?? ""}
            disabled={isDisabled}
            onChange={(event) =>
              navigateWithParameters({
                status: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">{t("All statuses")}</option>

            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {t(status.label)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="order-country"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            {t("Country")}
          </label>

          <input
            id="order-country"
            type="text"
            value={countryCode}
            disabled={isDisabled}
            maxLength={5}
            onChange={(event) => setCountryCode(event.target.value)}
            placeholder="DE"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="orders-per-page"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            {t("Per page")}
          </label>

          <select
            id="orders-per-page"
            value={searchParams.get("per_page") ?? "20"}
            disabled={isDisabled}
            onChange={(event) =>
              navigateWithParameters({
                per_page: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {pageSizeOptions.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isDisabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-400 xl:w-auto"
          >
            <Search className="h-4 w-4" />
            {t("Apply")}
          </button>
        </div>
      </form>
    </section>
  );
}
