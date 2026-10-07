"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

import type { PaginationMeta } from "@/types/order";

interface OrderPaginationProps {
  meta: PaginationMeta;
  disabled?: boolean;
}

type PaginationItem =
  | {
      type: "page";
      page: number;
    }
  | {
      type: "ellipsis";
      key: "start-ellipsis" | "end-ellipsis";
    };

function createPaginationItems(
  currentPage: number,
  lastPage: number,
): PaginationItem[] {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => ({
      type: "page" as const,
      page: index + 1,
    }));
  }

  const items: PaginationItem[] = [
    {
      type: "page",
      page: 1,
    },
  ];

  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(lastPage - 1, currentPage + 1);

  if (startPage > 2) {
    items.push({
      type: "ellipsis",
      key: "start-ellipsis",
    });
  }

  for (let page = startPage; page <= endPage; page += 1) {
    items.push({
      type: "page",
      page,
    });
  }

  if (endPage < lastPage - 1) {
    items.push({
      type: "ellipsis",
      key: "end-ellipsis",
    });
  }

  items.push({
    type: "page",
    page: lastPage,
  });

  return items;
}

export function OrderPagination({
  meta,
  disabled = false,
}: OrderPaginationProps) {
  const { t, locale } = useI18n();
  const pathname = usePathname();

  if (meta.total === 0) {
    return null;
  }

  const paginationItems = createPaginationItems(
    meta.current_page,
    meta.last_page,
  );

  const isDisabled = disabled;

  function navigateToPage(page: number) {
    if (
      page < 1 ||
      page > meta.last_page ||
      page === meta.current_page ||
      isDisabled
    ) {
      return;
    }

    const parameters = new URLSearchParams(window.location.search);

    if (page === 1) {
      parameters.delete("page");
    } else {
      parameters.set("page", String(page));
    }

    const queryString = parameters.toString();

    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    if (nextUrl !== window.location.pathname + window.location.search) {
      window.history.pushState(null, "", nextUrl);
    }
  }

  return (
    <nav
      aria-label={t("Orders pagination")}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-slate-500">
        {t("Showing")}{" "}
        <span className="font-semibold text-slate-800">{meta.from ?? 0}</span>{" "}
        {t("to")}{" "}
        <span className="font-semibold text-slate-800">{meta.to ?? 0}</span>{" "}
        {t("of")}{" "}
        <span className="font-semibold text-slate-800">
          {meta.total.toLocaleString(locale)}
        </span>{" "}
        {t("orders")}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={t("Go to previous page")}
          disabled={isDisabled || meta.current_page <= 1}
          onClick={() => navigateToPage(meta.current_page - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="hidden items-center gap-1.5 sm:flex">
          {paginationItems.map((item) => {
            if (item.type === "ellipsis") {
              return (
                <span
                  key={item.key}
                  className="inline-flex h-9 w-8 items-center justify-center text-sm text-slate-400"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const isCurrent = item.page === meta.current_page;

            return (
              <button
                key={item.page}
                type="button"
                aria-label={`Go to page ${item.page}`}
                aria-current={isCurrent ? "page" : undefined}
                disabled={isDisabled || isCurrent}
                onClick={() => navigateToPage(item.page)}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                } disabled:cursor-not-allowed`}
              >
                {item.page}
              </button>
            );
          })}
        </div>

        <span className="px-2 text-sm font-semibold text-slate-600 sm:hidden">
          {meta.current_page} / {meta.last_page}
        </span>

        <button
          type="button"
          aria-label={t("Go to next page")}
          disabled={isDisabled || meta.current_page >= meta.last_page}
          onClick={() => navigateToPage(meta.current_page + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
