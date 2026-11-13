"use client";

import { useI18n } from "@/components/i18n/language-provider";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Mail,
  Package,
  PackageOpen,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "@/components/ui/AppLink";
import { useEffect, useMemo, useRef, useState } from "react";

import { OrderMarketplaceBadge } from "@/components/orders/OrderMarketplaceBadge";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderActionsMenu } from "@/components/orders/OrderActionsMenu";
import { OrderBulkActions } from "@/components/orders/OrderBulkActions";
import {
  OrdersApiError,
  getOrders,
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

interface OrderTableProps {
  orders: Order[];
  onUpdated?: () => Promise<void> | void;
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? (value >>> 1) ^ 0xedb88330 : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function createZipArchive(
  files: Array<{ name: string; content: string }>,
): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encodeUtf8(file.name);
    const dataBytes = encodeUtf8(file.content);
    const checksum = crc32(dataBytes);
    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);
    localParts.push(localHeader, dataBytes);
    centralParts.push(
      concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(checksum),
        u32(dataBytes.length),
        u32(dataBytes.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes,
      ]),
    );
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0),
  ]);

  const zipBytes = concatBytes([
    ...localParts,
    centralDirectory,
    endRecord,
  ]);
  // Copy into a standalone ArrayBuffer so BlobPart typing accepts it (TS DOM libs).
  const zipBuffer = zipBytes.buffer.slice(
    zipBytes.byteOffset,
    zipBytes.byteOffset + zipBytes.byteLength,
  ) as ArrayBuffer;

  return new Blob([zipBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadOrdersExcel(
  orders: Order[],
  dateFrom: string,
  dateTo: string,
) {
  const header = [
    "id",
    "external_order_id",
    "Product - Instance name",
    "status",
    "workflow_status",
    "payment_status",
    "customer",
    "email",
    "total_amount",
    "currency",
    "marketplace",
    "ordered_at",
    "tracking_number",
    "tracking_url",
  ];
  const rows = [
    header,
    ...orders.map((order) => [
      String(order.id),
      order.external_order_id,
      order.items[0]?.title?.trim() || "",
      order.status,
      order.workflow_status,
      order.payment_status,
      order.customer.name ?? "",
      order.customer.email ?? "",
      order.total_amount,
      order.currency,
      order.marketplace.name,
      order.ordered_at ?? "",
      order.tracking_number ?? "",
      order.tracking_url ?? "",
    ]),
  ];
  const sheetRows = rows
    .map(
      (row) =>
        `<row>${row
          .map(
            (value) =>
              `<c t="inlineStr"><is><t>${xmlEscape(String(value))}</t></is></c>`,
          )
          .join("")}</row>`,
    )
    .join("");

  const blob = createZipArchive([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Orders" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`,
    },
  ]);

  const filename =
    dateFrom === dateTo
      ? `orders-export-${dateFrom}.xlsx`
      : `orders-export-${dateFrom}_${dateTo}.xlsx`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const exportDateInputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function OrderTable({ orders, onUpdated }: OrderTableProps) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportDateFrom, setExportDateFrom] = useState(todayIsoDate);
  const [exportDateTo, setExportDateTo] = useState(todayIsoDate);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const orderIdsKey = orders.map((order) => order.id).join(",");

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => orders.some((order) => order.id === id)),
    );
  }, [orderIdsKey, orders]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showExportToast(next: { kind: "success" | "error"; text: string }) {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }

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

  async function exportOrdersForDateRange() {
    const today = todayIsoDate();
    const dateFrom = exportDateFrom || today;
    const dateTo = exportDateTo || today;

    if (dateFrom > dateTo) {
      showExportToast({
        kind: "error",
        text: t("From date must be on or before the to date."),
      });
      return;
    }

    setExporting(true);
    try {
      const exported: Order[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await getOrders({
          date_from: dateFrom,
          date_to: dateTo,
          page,
          per_page: 100,
        });
        exported.push(...response.data);
        lastPage = response.meta.last_page;
        page += 1;
      } while (page <= lastPage);

      if (exported.length === 0) {
        showExportToast({
          kind: "error",
          text: t("No orders found for the selected date range."),
        });
        return;
      }

      downloadOrdersExcel(exported, dateFrom, dateTo);
      showExportToast({
        kind: "success",
        text: t(`Exported ${exported.length} order(s).`),
      });
    } catch (caught) {
      showExportToast({
        kind: "error",
        text:
          caught instanceof OrdersApiError
            ? caught.message
            : t("Unable to export orders."),
      });
    } finally {
      setExporting(false);
    }
  }

  if (orders.length === 0) return <OrdersEmptyState />;

  return (
    <section
      aria-labelledby="orders-results-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
            toast.kind === "error"
              ? "border-red-200 bg-white text-red-700"
              : "border-emerald-200 bg-white text-emerald-700"
          }`}
        >
          {toast.kind === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="flex-1 text-sm font-medium">{toast.text}</p>
          <button
            type="button"
            aria-label={t("Dismiss notification")}
            onClick={() => {
              if (toastTimerRef.current !== null) {
                window.clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
              }
              setToast(null);
            }}
            className="rounded-lg p-1 transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <OrderBulkActions
            orders={orders}
            selectedIds={selectedIds}
            onFeedback={setFeedback}
            onUpdated={onUpdated}
            onClearSelection={() => setSelectedIds([])}
          />
          <div>
            <h2
              id="orders-results-heading"
              className="text-base font-bold text-slate-900"
            >
              {t("Order results")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {selectedIds.length > 0
                ? t(`${selectedIds.length} selected`)
                : t(
                    "Customer, item, payment and delivery information for synchronized orders.",
                  )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {t("Export")}
            </span>
            <label htmlFor="orders-export-date-from" className="sr-only">
              {t("From date")}
            </label>
            <input
              id="orders-export-date-from"
              type="date"
              value={exportDateFrom}
              max={exportDateTo || undefined}
              onChange={(event) => setExportDateFrom(event.target.value)}
              className={exportDateInputClass}
              title={t("From date")}
            />
            <span className="text-xs font-medium text-slate-500" aria-hidden="true">
              –
            </span>
            <label htmlFor="orders-export-date-to" className="sr-only">
              {t("To date")}
            </label>
            <input
              id="orders-export-date-to"
              type="date"
              value={exportDateTo}
              min={exportDateFrom || undefined}
              onChange={(event) => setExportDateTo(event.target.value)}
              className={exportDateInputClass}
              title={t("To date")}
            />
            <button
              type="button"
              disabled={exporting}
              onClick={() => void exportOrdersForDateRange()}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500 bg-white px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? t("Exporting…") : t("Export")}
            </button>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {orders.length} {t("shown")}
          </span>
        </div>
      </div>

      {feedback && (
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
      )}

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1440px] table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr>
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
              <TableHeading className="w-[175px]">
                {t("Date & site")}
              </TableHeading>
              <TableHeading className="w-[360px]">
                {t("Order & item details")}
              </TableHeading>
              <TableHeading className="w-[220px]">
                {t("Customer & total")}
              </TableHeading>
              <TableHeading className="w-[200px]">
                {t("Status & payment")}
              </TableHeading>
              <TableHeading className="w-[340px]">
                {t("Delivery options")}
              </TableHeading>
              <TableHeading className="sticky right-0 z-20 w-[300px] min-w-[300px] bg-slate-50 shadow-[-12px_0_16px_-12px_rgba(15,23,42,0.35)]">
                {t("Actions")}
              </TableHeading>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {orders.map((order) => (
              <DesktopOrderRow
                key={order.id}
                order={order}
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
  selected,
  onSelectedChange,
  onUpdated,
}: {
  order: Order;
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
        selected ? "bg-blue-50/40" : ""
      }`}
    >
      <td className="px-4 py-5 sm:px-5">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelectedChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          aria-label={t(`Select order #${order.external_order_id}`)}
        />
      </td>
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
  selected,
  onSelectedChange,
  onUpdated,
}: {
  order: Order;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onUpdated?: () => Promise<void> | void;
}) {
  const { t, locale } = useI18n();
  const primaryItem = order.items[0];
  return (
    <article className={`p-5 ${selected ? "bg-blue-50/40" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            aria-label={t(`Select order #${order.external_order_id}`)}
          />
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
