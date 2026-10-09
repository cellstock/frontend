"use client";

import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  LockKeyhole,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Tags,
  UnlockKeyhole,
  XCircle,
  X,
} from "lucide-react";
import Image from "@/components/ui/AppImage";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AppLink from "@/components/ui/AppLink";
import { ContentLoading } from "@/components/ui/ContentLoading";
import {
  getInventory,
  InventoryApiError,
  syncInventory,
  updateInventoryBulk,
} from "@/lib/api/inventory";
import type { InventoryOffer } from "@/types/inventory";

type BulkAction =
  | "queue_upload"
  | "inactive"
  | "out_of_stock"
  | "add_tag"
  | "delete_tag"
  | "delete_all_tags";

export function InventoryTablePage() {
  const [response, setResponse] = useState<Awaited<
    ReturnType<typeof getInventory>
  > | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState("sku");
  const [status, setStatus] = useState("all");
  const [grade, setGrade] = useState("all");
  const [stock, setStock] = useState("all");
  const [sort, setSort] = useState("created_desc");
  const [market, setMarket] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDialog, setBulkDialog] = useState<BulkAction | null>(null);
  const [outOfStockOffer, setOutOfStockOffer] = useState<InventoryOffer | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState("");
  const [busySku, setBusySku] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getInventory({
      page,
      limit: perPage,
      search: search.trim() || undefined,
      search_by: searchBy,
      status: status === "all" ? undefined : status,
      grade: grade === "all" ? undefined : grade,
      stock: stock === "all" ? undefined : stock,
      sort,
      market: market || undefined,
    })
      .then((result) => {
        if (!controller.signal.aborted) setResponse(result);
      })
      .catch((caught) => {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught
              : new Error("Unable to load inventory."),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [
    page,
    perPage,
    reload,
    search,
    searchBy,
    status,
    grade,
    stock,
    sort,
    market,
  ]);

  const offers = useMemo(() => response?.data.offers ?? [], [response]);
  const selectedOffers = offers.filter((offer) => selected.includes(offer.id));
  const inStockIds = offers
    .filter((offer) => offer.stock > 0)
    .map((offer) => offer.id);
  const allInStockSelected =
    inStockIds.length > 0 && inStockIds.every((id) => selected.includes(id));

  function refresh() {
    setError(null);
    setReload((value) => value + 1);
  }
  async function synchronize() {
    setIsLoading(true);
    setActionMessage("");
    try {
      const result = await syncInventory();
      setActionMessage(
        `${result.message} ${result.data.synchronized} offers stored.`,
      );
      setPage(1);
      refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught
          : new Error("Unable to synchronize inventory."),
      );
      setIsLoading(false);
    }
  }
  function clearFilters() {
    setSearch("");
    setSearchBy("sku");
    setStatus("all");
    setGrade("all");
    setStock("all");
    setSort("created_desc");
    setPage(1);
  }
  function toggleOffer(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  function toggleInStock() {
    setSelected((current) =>
      allInStockSelected
        ? current.filter((id) => !inStockIds.includes(id))
        : Array.from(new Set([...current, ...inStockIds])),
    );
  }

  async function sendOutOfStock(offer: InventoryOffer) {
    setBusySku(offer.sku);
    try {
      await updateInventoryBulk({
        offer_ids: [offer.id],
        action: "out_of_stock",
      });
      setActionMessage(`${offer.sku} was sent out of stock.`);
      setOutOfStockOffer(null);
      refresh();
    } catch (caught) {
      throw caught instanceof InventoryApiError
        ? caught
        : new Error("Unable to send the offer out of stock.");
    } finally {
      setBusySku("");
    }
  }

  async function runBulkAction(action: BulkAction, tag?: string) {
    const result = await updateInventoryBulk({
      offer_ids: selectedOffers.map((offer) => offer.id),
      action,
      tag,
    });
    setActionMessage(
      `${result.data.updated} offers updated${result.data.failed ? `, ${result.data.failed} failed` : ""}.`,
    );
    setBulkDialog(null);
    refresh();
  }

  const total = response?.data.pagination.total ?? 0;
  const marketplace = response?.data.marketplace;
  return (
    <InventoryShell
      title="Inventory table"
      subtitle="Manage synchronized offers stored in CelleXa."
    >
      {actionMessage && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800"
        >
          {actionMessage}
        </p>
      )}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 lg:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Inventory of
                </h2>
                <MarketplacePicker
                  marketplace={marketplace}
                  markets={response?.data.markets ?? []}
                  selectedMarket={
                    market || response?.data.selected_market || ""
                  }
                  onChange={(code) => {
                    setMarket(code);
                    setSelected([]);
                    setPage(1);
                  }}
                />
              </div>
              <label className="mt-5 flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={allInStockSelected}
                  onChange={toggleInStock}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600"
                />
                Select all offers in stock on this page
              </label>
            </div>
            <div className="text-center xl:min-w-40">
              <p className="text-3xl font-light text-slate-800">
                {total.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">results in stock</p>
            </div>
            <div className="flex w-full max-w-xl overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
              <select
                value={searchBy}
                onChange={(event) => {
                  setSearchBy(event.target.value);
                  setPage(1);
                }}
                className="border-r border-slate-300 bg-white px-4 text-sm font-semibold outline-none"
              >
                <option value="sku">SKU</option>
                <option value="title">Title</option>
                <option value="ean">EAN</option>
                <option value="all">All</option>
              </select>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={`Search by ${searchBy.toUpperCase()}`}
                className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
              />
              <span className="grid w-14 place-items-center bg-blue-600 text-white">
                <Search className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <BulkActionMenu
              disabled={selected.length === 0}
              onSelect={setBulkDialog}
            />
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Status"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={[
                  ["all", "All statuses"],
                  ["OK", "OK"],
                  ["REJECTED", "Rejected"],
                  ["PENDING", "Pending"],
                ]}
              />
              <FilterSelect
                label="State"
                value={grade}
                onChange={(value) => {
                  setGrade(value);
                  setPage(1);
                }}
                options={[
                  ["all", "All states"],
                  ["AA", "Premium"],
                  ["A", "Very good"],
                  ["B", "Good"],
                  ["C", "Fair"],
                ]}
              />
              <FilterSelect
                label="Stock"
                value={stock}
                onChange={(value) => {
                  setStock(value);
                  setPage(1);
                }}
                options={[
                  ["all", "All stock"],
                  ["in", "In stock"],
                  ["out", "Out of stock"],
                ]}
              />
              <FilterSelect
                label="Sort"
                value={sort}
                onChange={(value) => {
                  setSort(value);
                  setPage(1);
                }}
                options={[
                  ["created_desc", "Newest"],
                  ["created_asc", "Oldest"],
                  ["stock_desc", "Stock high-low"],
                  ["price_desc", "Price high-low"],
                ]}
              />
              <button
                onClick={clearFilters}
                className="px-3 text-sm font-semibold text-blue-600"
              >
                Clear
              </button>
              <button
                onClick={() => void synchronize()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Sync
              </button>
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="p-8">
            <ContentLoading label="Loading inventory" />
          </div>
        ) : error ? (
          <div className="m-5 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <span className="flex gap-2">
              <AlertCircle className="h-5 w-5" />
              {error.message}
            </span>
            <button onClick={refresh} className="font-bold">
              Retry
            </button>
          </div>
        ) : (
          <InventoryDataTable
            offers={offers}
            marketplace={marketplace}
            selected={selected}
            busySku={busySku}
            onToggle={toggleOffer}
            onOutOfStock={setOutOfStockOffer}
          />
        )}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Rows per page
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1.5"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button
              disabled={page === 1 || isLoading}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-600">
              Page {page} of {response?.data.pagination.last_page ?? 1}
            </span>
            <button
              disabled={
                page >= (response?.data.pagination.last_page ?? 1) || isLoading
              }
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      {bulkDialog && (
        <BulkActionModal
          action={bulkDialog}
          count={selectedOffers.length}
          onClose={() => setBulkDialog(null)}
          onConfirm={runBulkAction}
        />
      )}
      {outOfStockOffer && (
        <OutOfStockModal
          offer={outOfStockOffer}
          onClose={() => setOutOfStockOffer(null)}
          onConfirm={sendOutOfStock}
        />
      )}
    </InventoryShell>
  );
}

function InventoryDataTable({
  offers,
  marketplace,
  selected,
  busySku,
  onToggle,
  onOutOfStock,
}: {
  offers: InventoryOffer[];
  marketplace?: { name: string; slug: string; logo?: string | null };
  selected: string[];
  busySku: string;
  onToggle: (id: string) => void;
  onOutOfStock: (offer: InventoryOffer) => void;
}) {
  const money = (value?: string | null, currency = "") =>
    value && Number(value) > 0
      ? `${Number(value).toFixed(2)} ${currency}`
      : "—";
  const logo =
    marketplace?.slug === "back-market"
      ? "/images/marketplaces/back-market.jpg"
      : "/images/marketplaces/refurbed.png";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
          <tr>
            {[
              "",
              "Creation date",
              "Status",
              "Tags",
              "Title",
              "State",
              "Qty",
              "Repriced price",
              "Online price",
              "Selected competitor",
              "Diff.",
              "Sales rank",
              "Buy box",
              "Lowest price",
              "Lock price",
              "Actions",
            ].map((heading, index) => (
              <th
                key={`${heading}-${index}`}
                className="px-4 py-4 text-center first:text-left"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {offers.map((offer) => {
            const online = Number(offer.online_price || 0),
              lowest = Number(offer.lowest_price || 0);
            return (
              <tr
                key={offer.id}
                className="bg-white transition hover:bg-blue-50/40"
              >
                <td className="px-4 py-5">
                  <input
                    type="checkbox"
                    checked={selected.includes(offer.id)}
                    onChange={() => onToggle(offer.id)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600"
                  />
                </td>
                <td className="px-4 py-5 text-center">
                  <DateCell value={offer.created_at} />
                </td>
                <td className="px-4 py-5 text-center">
                  <div
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                    title={`${marketplace?.name || "Marketplace"}: ${offer.state}`}
                  >
                    <Image
                      src={logo}
                      alt={marketplace?.name || "Marketplace"}
                      width={30}
                      height={30}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span
                    className={`mt-1 inline-block text-[10px] font-bold ${offer.state === "REJECTED" ? "text-red-600" : "text-slate-500"}`}
                  >
                    {offer.state || "—"}
                  </span>
                </td>
                <td className="px-4 py-5 text-center">
                  {(offer.tags ?? []).length
                    ? (offer.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="mr-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                        >
                          {tag}
                        </span>
                      ))
                    : "—"}
                </td>
                <td className="px-4 py-5">
                  <div className="flex min-w-72 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="max-w-72 whitespace-normal font-bold text-slate-900">
                        {offer.instance_name || "Unnamed offer"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        SKU: {offer.sku || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        EAN: {offer.ean || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-5 text-center">
                  <p>Refurbished</p>
                  <p className="font-semibold">{gradeLabel(offer.grading)}</p>
                </td>
                <td className="px-4 py-5 text-center font-bold">
                  {offer.stock}
                </td>
                <td className="px-4 py-5 text-center">
                  {money(offer.repriced_price, offer.reference_currency_code)}
                </td>
                <td className="px-4 py-5 text-center">
                  {money(offer.online_price, offer.reference_currency_code)}
                </td>
                <td className="px-4 py-5 text-center">
                  {offer.selected_competitor || "—"}
                </td>
                <td className="px-4 py-5 text-center">
                  {online && lowest
                    ? `${(online - lowest).toFixed(2)} ${offer.reference_currency_code}`
                    : "—"}
                </td>
                <td className="px-4 py-5 text-center">
                  {offer.sales_rank ?? "—"}
                </td>
                <td className="px-4 py-5 text-center">
                  {offer.buy_box ? (
                    <CheckCircle2
                      className="mx-auto h-5 w-5 text-emerald-600"
                      aria-label="Buy Box won"
                    />
                  ) : (
                    <XCircle
                      className="mx-auto h-5 w-5 text-slate-300"
                      aria-label="No Buy Box"
                    />
                  )}
                </td>
                <td className="px-4 py-5 text-center">
                  {money(offer.lowest_price, offer.reference_currency_code)}
                </td>
                <td className="px-4 py-5 text-center">
                  {offer.price_locked ? (
                    <LockKeyhole className="mx-auto h-5 w-5 text-slate-700" />
                  ) : (
                    <UnlockKeyhole className="mx-auto h-5 w-5 text-slate-400" />
                  )}
                </td>
                <td className="px-4 py-5">
                  <div className="flex justify-center gap-2">
                    <AppLink
                      href={`/dashboard/inventory/offers/edit/?offerId=${encodeURIComponent(offer.id)}`}
                      title="Edit offer"
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </AppLink>
                    <button
                      disabled={busySku === offer.sku || offer.stock === 0}
                      onClick={() => void onOutOfStock(offer)}
                      title="Send product out of stock"
                      className="rounded-lg p-2 text-amber-600 hover:bg-amber-100 disabled:opacity-35"
                    >
                      <CircleOff className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {offers.length === 0 && (
        <p className="p-12 text-center text-sm text-slate-500">
          No offers match the selected filters.
        </p>
      )}
    </div>
  );
}

function BulkActionMenu({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (action: BulkAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const choose = (action: BulkAction) => {
    onSelect(action);
    setOpen(false);
    setTagsOpen(false);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
      >
        <span>Select what you want to do</span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <button
            aria-label="Close actions"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => {
              setOpen(false);
              setTagsOpen(false);
            }}
          />
          <div className="absolute left-0 top-full z-40 mt-2 w-[min(92vw,520px)] overflow-visible rounded-2xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-2xl">
            <MenuButton
              disabled={disabled}
              onClick={() => choose("queue_upload")}
            >
              Put selected items in the next inventory upload
            </MenuButton>
            <MenuButton disabled={disabled} onClick={() => choose("inactive")}>
              Change selected items to inactive
            </MenuButton>
            <MenuButton
              disabled={disabled}
              onClick={() => choose("out_of_stock")}
            >
              Send selected products out of stock
            </MenuButton>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTagsOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-semibold transition hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Tags
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
              {tagsOpen && (
                <div className="absolute left-full top-0 ml-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl max-lg:left-4 max-lg:top-full max-lg:ml-0">
                  <MenuButton
                    disabled={disabled}
                    onClick={() => choose("add_tag")}
                  >
                    Add a tag
                  </MenuButton>
                  <MenuButton
                    disabled={disabled}
                    onClick={() => choose("delete_tag")}
                  >
                    Delete a tag
                  </MenuButton>
                  <MenuButton
                    disabled={disabled}
                    onClick={() => choose("delete_all_tags")}
                  >
                    Delete all tags
                  </MenuButton>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function MenuButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="block w-full rounded-xl px-4 py-3 text-left transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MarketplacePicker({
  marketplace,
  markets,
  selectedMarket,
  onChange,
}: {
  marketplace?: {
    name: string;
    slug: string;
    logo?: string | null;
    account_name?: string | null;
  };
  markets: Array<{
    code: string;
    name: string;
    currency_code?: string | null;
  }>;
  selectedMarket: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const logo =
    marketplace?.slug === "back-market"
      ? "/images/marketplaces/back-market.jpg"
      : "/images/marketplaces/refurbed.png";
  const name = marketplace?.name || "Refurbed";
  const activeMarket =
    markets.find((item) => item.code === selectedMarket) ?? markets[0];
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-w-48 items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus:ring-4 focus:ring-blue-100"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white p-1">
          <Image
            src={logo}
            alt=""
            width={28}
            height={28}
            className="h-full w-full object-contain"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900">
            {activeMarket ? `${name} ${activeMarket.code}` : name}
          </span>
          {marketplace?.account_name && (
            <span className="block truncate text-xs text-slate-500">
              {activeMarket?.name || marketplace.account_name}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close marketplace list"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="listbox"
            aria-label="Marketplace"
            className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          >
            {markets.map((item) => {
              const selected = item.code === activeMarket?.code;

              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${selected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-100 bg-white p-1.5">
                    <Image
                      src={logo}
                      alt=""
                      width={30}
                      height={30}
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">
                      {name} {item.code}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {item.name}
                      {item.currency_code ? ` · ${item.currency_code}` : ""}
                    </span>
                  </span>
                  {selected && (
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              );
            })}
            {markets.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-500">
                No markets are enabled for offer management.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const bulkActionCopy: Record<
  BulkAction,
  { title: string; description: string; confirm: string }
> = {
  queue_upload: {
    title: "Queue selected offers",
    description:
      "The selected offers will be included in the next Refurbed inventory upload.",
    confirm: "Queue offers",
  },
  inactive: {
    title: "Make selected offers inactive",
    description:
      "Their stock will be set to zero on Refurbed and the offers will be marked inactive in CelleXa.",
    confirm: "Make inactive",
  },
  out_of_stock: {
    title: "Send selected offers out of stock",
    description: "Their stock quantity will be changed to zero on Refurbed.",
    confirm: "Send out of stock",
  },
  add_tag: {
    title: "Add a tag",
    description: "Enter the tag that should be added to every selected offer.",
    confirm: "Add tag",
  },
  delete_tag: {
    title: "Delete a tag",
    description:
      "Enter the tag that should be removed from every selected offer.",
    confirm: "Delete tag",
  },
  delete_all_tags: {
    title: "Delete all tags",
    description: "All CelleXa tags will be removed from the selected offers.",
    confirm: "Delete all tags",
  },
};

function BulkActionModal({
  action,
  count,
  onClose,
  onConfirm,
}: {
  action: BulkAction;
  count: number;
  onClose: () => void;
  onConfirm: (action: BulkAction, tag?: string) => Promise<void>;
}) {
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requiresTag = action === "add_tag" || action === "delete_tag";
  const copy = bulkActionCopy[action];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTag = tag.trim();
    if (requiresTag && !cleanTag) {
      setError("Enter a tag before continuing.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(action, requiresTag ? cleanTag : undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update the selected offers.",
      );
      setSaving(false);
    }
  }

  return (
    <ActionModal
      title={copy.title}
      description={copy.description}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {requiresTag && (
          <label className="block text-sm font-semibold text-slate-700">
            Tag name
            <input
              autoFocus
              maxLength={50}
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Enter a tag"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        )}
        <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          {count} selected {count === 1 ? "offer" : "offers"}
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <ModalActions
          saving={saving}
          confirmLabel={copy.confirm}
          onClose={onClose}
        />
      </form>
    </ActionModal>
  );
}

function OutOfStockModal({
  offer,
  onClose,
  onConfirm,
}: {
  offer: InventoryOffer;
  onClose: () => void;
  onConfirm: (offer: InventoryOffer) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setSaving(true);
    setError("");
    try {
      await onConfirm(offer);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update this offer.",
      );
      setSaving(false);
    }
  }
  return (
    <ActionModal
      title="Send product out of stock"
      description="This changes the product quantity to zero on Refurbed. The offer remains available in CelleXa and can be restocked later."
      onClose={onClose}
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="font-bold text-slate-900">{offer.instance_name}</p>
        <p className="mt-1 text-xs text-slate-500">
          SKU: {offer.sku} · Current stock: {offer.stock}
        </p>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <ModalActions
        saving={saving}
        confirmLabel="Send out of stock"
        onClose={onClose}
        onConfirm={() => void confirm()}
      />
    </ActionModal>
  );
}

function ActionModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-sm font-bold text-blue-600">Inventory action</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
function ModalActions({
  saving,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  saving: boolean;
  confirmLabel: string;
  onClose: () => void;
  onConfirm?: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        disabled={saving}
        onClick={onClose}
        className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type={onConfirm ? "button" : "submit"}
        disabled={saving}
        onClick={onConfirm}
        className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Please wait…" : confirmLabel}
      </button>
    </div>
  );
}

function DateCell({ value }: { value?: string }) {
  if (!value) return <>—</>;
  const date = new Date(value);
  return (
    <>
      <p>{date.toLocaleDateString()}</p>
      <p className="text-xs text-slate-500">{date.toLocaleTimeString()}</p>
    </>
  );
}
function gradeLabel(grade: string) {
  return (
    (
      { AA: "Premium", A: "Very good", B: "Good", C: "Fair" } as Record<
        string,
        string
      >
    )[grade] ||
    grade ||
    "—"
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<readonly [string, string]>;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
export function InventoryShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isInventoryTable = pathname === "/dashboard/inventory";

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <div className="flex flex-wrap items-center gap-4">
          <AppLink
            href="/dashboard/inventory"
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <Boxes className="h-4 w-4" />
            Inventory
          </AppLink>
          {!isInventoryTable && (
            <AppLink
              href="/dashboard/inventory"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to inventory
            </AppLink>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}
