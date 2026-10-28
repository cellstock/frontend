"use client";

import { useI18n } from "@/components/i18n/language-provider";
import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getRefurbedOrderInvoice,
  OrdersApiError,
  refreshOrderFromRefurbed,
  sendOrderBuyerEmail,
  updateOrderEditFields,
  updateOrderStatus,
} from "@/lib/api/orders";
import { createOrderSlipsPdf } from "@/lib/orders/order-pdf";
import { apiFetch } from "@/lib/public-path";
import type { Order, RefurbedOrderStatus } from "@/types/order";

type Feedback = { kind: "success" | "error"; text: string };

const WORKFLOW_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "dispatched", label: "Dispatched" },
  { value: "on_hold", label: "On hold" },
] as const;

const PAYMENT_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "waiting_for_payment", label: "Waiting for payment" },
  { value: "partially_refunded", label: "Partially refunded" },
  { value: "refunded", label: "Refunded" },
] as const;

const EMAIL_OPTIONS = [
  { value: "confirmation", label: "Order confirmation" },
  { value: "shipment_confirmation", label: "Shipment confirmation" },
  { value: "correspondence", label: "Correspondence" },
  { value: "payment_reminder", label: "Payment reminder" },
  { value: "evaluation_reminder", label: "Evaluation reminder" },
  { value: "reimbursement", label: "Reimbursement" },
] as const;

const STATUS_OPTIONS: Array<{ value: RefurbedOrderStatus; label: string }> = [
  { value: "ACCEPTED", label: "Accepted" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RETURNED", label: "Returned" },
];

interface OrderBulkActionsProps {
  orders: Order[];
  selectedIds: number[];
  onFeedback?: (feedback: Feedback) => void;
  onUpdated?: () => Promise<void> | void;
  onClearSelection?: () => void;
}

export function OrderBulkActions({
  orders,
  selectedIds,
  onFeedback,
  onUpdated,
  onClearSelection,
}: OrderBulkActionsProps) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const [nestedMenu, setNestedMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.includes(order.id)),
    [orders, selectedIds],
  );
  const selectedCount = selectedOrders.length;
  const disabled = selectedCount === 0 || busy;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
        setSubmenu(null);
        setNestedMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSubmenu(null);
        setNestedMenu(null);
      }
    };
    window.addEventListener("mousedown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function runBulk(
    label: string,
    action: (order: Order) => Promise<void>,
  ) {
    if (selectedOrders.length === 0) return;
    setBusy(true);
    setOpen(false);
    setSubmenu(null);
    setNestedMenu(null);
    let ok = 0;
    const errors: string[] = [];
    for (const order of selectedOrders) {
      try {
        await action(order);
        ok += 1;
      } catch (error) {
        errors.push(
          `#${order.external_order_id}: ${
            error instanceof OrdersApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Failed"
          }`,
        );
      }
    }
    setBusy(false);
    if (ok > 0) await onUpdated?.();
    if (errors.length === 0) {
      onFeedback?.({
        kind: "success",
        text: t(`${label} completed for ${ok} order(s).`),
      });
      onClearSelection?.();
    } else {
      onFeedback?.({
        kind: errors.length === selectedOrders.length ? "error" : "success",
        text: `${ok} succeeded, ${errors.length} failed. ${errors[0]}`,
      });
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const header = [
      "id",
      "external_order_id",
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
    const rows = selectedOrders.map((order) =>
      [
        order.id,
        order.external_order_id,
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
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    downloadBlob(
      new Blob([[header.join(","), ...rows].join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
      `orders-export-${selectedCount}.csv`,
    );
    onFeedback?.({
      kind: "success",
      text: t(`Exported ${selectedCount} order(s).`),
    });
    setOpen(false);
    setSubmenu(null);
    setNestedMenu(null);
  }

  function closeMenus() {
    setOpen(false);
    setSubmenu(null);
    setNestedMenu(null);
  }

  function printPickList() {
    const rows = selectedOrders
      .map((order) => {
        const items = order.items
          .map(
            (item) =>
              `<li>${escapeHtml(item.sku || "-")} · ${escapeHtml(item.title || "Item")} × ${item.quantity}</li>`,
          )
          .join("");
        return `<tr><td>#${escapeHtml(order.external_order_id)}</td><td>${escapeHtml(order.customer.name || "")}</td><td><ul>${items}</ul></td></tr>`;
      })
      .join("");
    const html = `<!doctype html><html><head><title>Pick list</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;vertical-align:top}ul{margin:0;padding-left:18px}</style>
      </head><body><h1>Pick list (${selectedCount})</h1>
      <table><thead><tr><th>Order</th><th>Customer</th><th>Items</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!popup) {
      onFeedback?.({
        kind: "error",
        text: t("Allow pop-ups to print the pick list."),
      });
      return;
    }
    popup.document.write(html);
    popup.document.close();
    closeMenus();
  }

  async function printSlips(
    includePrices: boolean,
    mode: "pdf" | "browser",
  ) {
    closeMenus();
    if (mode === "browser") {
      openPrintWindow(
        buildSlipsHtml(selectedOrders, includePrices),
        includePrices ? "Order slips with prices" : "Order slips without prices",
      );
      return;
    }

    setBusy(true);
    try {
      const blob = createOrderSlipsPdf(selectedOrders, includePrices);
      downloadBlob(
        blob,
        selectedCount === 1
          ? `slip-${selectedOrders[0].external_order_id}.pdf`
          : `order-slips-${selectedCount}.pdf`,
      );
      onFeedback?.({
        kind: "success",
        text: t(`Downloaded 1 PDF with ${selectedCount} packing slip(s).`),
      });
    } catch (error) {
      onFeedback?.({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : t("Unable to print slips."),
      });
    } finally {
      setBusy(false);
    }
  }

  async function printInvoices() {
    await runBulk("Invoice download", async (order) => {
      const result = await getRefurbedOrderInvoice(order.id);
      const url = result.data.url;
      if (!url) throw new Error("No invoice URL available.");
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  async function printLabels(mode: "pdf-1" | "pdf-2" | "browser") {
    const format = mode === "pdf-2" ? "top_right" : "label_printer";
    const columns = mode === "pdf-2" ? 2 : 1;

    // Open during the click gesture so the popup is not blocked, then fill it.
    const popup = window.open("about:blank", "_blank", "width=1200,height=900");
    if (!popup) {
      closeMenus();
      onFeedback?.({
        kind: "error",
        text: t("Allow pop-ups for this site to print shipping labels."),
      });
      return;
    }
    popup.document.write(
      `<!doctype html><html><head><title>Loading labels</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#334155"><p>Loading shipping labels…</p></body></html>`,
    );
    popup.document.close();
    closeMenus();
    setBusy(true);

    const pdfBlobs: Blob[] = [];
    const failed: string[] = [];

    try {
      for (const order of selectedOrders) {
        try {
          const response = await apiFetch(
            `/api/orders/${order.id}/shipping-label/file?format=${format}`,
            {
              credentials: "include",
              headers: { Accept: "application/pdf" },
              cache: "no-store",
            },
          );
          if (!response.ok) {
            let detail = `HTTP ${response.status}`;
            try {
              const errorBody = (await response.json()) as { message?: string };
              if (errorBody.message) detail = errorBody.message;
            } catch {
              /* binary/error body */
            }
            failed.push(`#${order.external_order_id} (${detail})`);
            continue;
          }
          const blob = await response.blob();
          if (!blob.size) {
            failed.push(`#${order.external_order_id} (empty file)`);
            continue;
          }
          const type = (blob.type || "").toLowerCase();
          if (type.includes("json") || type.includes("html")) {
            failed.push(`#${order.external_order_id} (invalid response)`);
            continue;
          }
          pdfBlobs.push(
            blob.type.includes("pdf")
              ? blob
              : new Blob([blob], { type: "application/pdf" }),
          );
        } catch (error) {
          failed.push(
            `#${order.external_order_id} (${
              error instanceof Error ? error.message : "request failed"
            })`,
          );
        }
      }

      if (pdfBlobs.length === 0) {
        popup.document.open();
        popup.document.write(
          `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#b91c1c"><h1>No shipping labels loaded</h1><p>Create labels from Actions → Create shipping label, refresh the orders list, then try again.</p></body></html>`,
        );
        popup.document.close();
        onFeedback?.({
          kind: "error",
          text: t(
            "No shipping labels could be loaded. Create them first, then refresh and print.",
          ),
        });
        return;
      }

      // Browsers cannot print PDF iframes (empty print preview). Merge into one PDF
      // and open that document so Print shows only the labels.
      const merged = await mergeShippingLabelPdfs(pdfBlobs, columns);
      const pdfUrl = URL.createObjectURL(merged);
      popup.location.replace(pdfUrl);
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 120_000);

      onFeedback?.({
        kind: failed.length ? "error" : "success",
        text: failed.length
          ? t(
              `Opened ${pdfBlobs.length} label(s) in one PDF. Failed: ${failed.join(", ")}.`,
            )
          : t(
              `Opened ${pdfBlobs.length} shipping label(s) in one PDF. Use the browser print dialog.`,
            ),
      });
    } catch (error) {
      popup.document.open();
      popup.document.write(
        `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#b91c1c"><h1>Unable to build label PDF</h1><p>${escapeHtml(
          error instanceof Error ? error.message : "Unknown error",
        )}</p></body></html>`,
      );
      popup.document.close();
      onFeedback?.({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : t("Unable to build the shipping label PDF."),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((value) => !value);
          setSubmenu(null);
          setNestedMenu(null);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : null}
        {selectedCount > 0
          ? t(`Select an action (${selectedCount} selected)`)
          : t("Select an action")}
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full z-40 mt-2 min-w-[280px] overflow-visible rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          role="menu"
        >
          <MenuItemWithSub
            label={t("Edit order status")}
            open={submenu === "workflow"}
            onOpen={() => {
              setSubmenu("workflow");
              setNestedMenu(null);
            }}
          >
            {WORKFLOW_OPTIONS.map((option) => (
              <SubMenuButton
                key={option.value}
                onClick={() =>
                  void runBulk("Workflow update", (order) =>
                    updateOrderEditFields(order.id, {
                      workflow_status: option.value,
                    }).then(() => undefined),
                  )
                }
              >
                {t(option.label)}
              </SubMenuButton>
            ))}
            <div className="my-1 border-t border-slate-100" />
            {STATUS_OPTIONS.map((option) => (
              <SubMenuButton
                key={option.value}
                onClick={() =>
                  void runBulk("Marketplace status update", (order) =>
                    updateOrderStatus(order.id, {
                      status: option.value,
                      ...(option.value === "SHIPPED" && order.tracking_url
                        ? { tracking_url: order.tracking_url }
                        : {}),
                    }).then(() => undefined),
                  )
                }
              >
                {t(option.label)}
              </SubMenuButton>
            ))}
          </MenuItemWithSub>

          <MenuItemWithSub
            label={t("Change payment status")}
            open={submenu === "payment"}
            onOpen={() => {
              setSubmenu("payment");
              setNestedMenu(null);
            }}
          >
            {PAYMENT_OPTIONS.map((option) => (
              <SubMenuButton
                key={option.value}
                onClick={() =>
                  void runBulk("Payment status update", (order) =>
                    updateOrderEditFields(order.id, {
                      payment_status: option.value,
                    }).then(() => undefined),
                  )
                }
              >
                {t(option.label)}
              </SubMenuButton>
            ))}
          </MenuItemWithSub>

          <MenuButton onClick={printPickList}>{t("Print a pick list")}</MenuButton>

          <MenuItemWithSub
            label={t("Print slip")}
            open={submenu === "slip"}
            onOpen={() => {
              setSubmenu("slip");
              setNestedMenu(null);
            }}
          >
            <MenuItemWithSub
              label={t("Print slip with prices")}
              open={nestedMenu === "slip-prices"}
              onOpen={() => setNestedMenu("slip-prices")}
            >
              <SubMenuButton onClick={() => void printSlips(true, "pdf")}>
                {t("PDF")}
              </SubMenuButton>
              <SubMenuButton onClick={() => void printSlips(true, "browser")}>
                {t("In browser")}
              </SubMenuButton>
            </MenuItemWithSub>
            <MenuItemWithSub
              label={t("Print slip without prices")}
              open={nestedMenu === "slip-plain"}
              onOpen={() => setNestedMenu("slip-plain")}
            >
              <SubMenuButton onClick={() => void printSlips(false, "pdf")}>
                {t("PDF")}
              </SubMenuButton>
              <SubMenuButton onClick={() => void printSlips(false, "browser")}>
                {t("In browser")}
              </SubMenuButton>
            </MenuItemWithSub>
          </MenuItemWithSub>

          <MenuItemWithSub
            label={t("Print label")}
            open={submenu === "label"}
            onOpen={() => {
              setSubmenu("label");
              setNestedMenu(null);
            }}
          >
            <SubMenuButton onClick={() => void printLabels("pdf-1")}>
              {t("PDF (1 column)")}
            </SubMenuButton>
            <SubMenuButton onClick={() => void printLabels("pdf-2")}>
              {t("PDF (2 columns)")}
            </SubMenuButton>
            <SubMenuButton onClick={() => void printLabels("browser")}>
              {t("In browser")}
            </SubMenuButton>
          </MenuItemWithSub>

          <MenuButton onClick={() => void printInvoices()}>
            {t("Print an invoice")}
          </MenuButton>

          <MenuItemWithSub
            label={t("Send an email")}
            open={submenu === "email"}
            onOpen={() => {
              setSubmenu("email");
              setNestedMenu(null);
            }}
          >
            {EMAIL_OPTIONS.map((option) => (
              <SubMenuButton
                key={option.value}
                onClick={() =>
                  void runBulk("Email send", (order) =>
                    sendOrderBuyerEmail(order.id, option.value).then(
                      () => undefined,
                    ),
                  )
                }
              >
                {t(option.label)}
              </SubMenuButton>
            ))}
          </MenuItemWithSub>

          <MenuItemWithSub
            label={t("Export orders")}
            open={submenu === "export"}
            onOpen={() => {
              setSubmenu("export");
              setNestedMenu(null);
            }}
          >
            <SubMenuButton onClick={exportCsv}>{t("CSV")}</SubMenuButton>
          </MenuItemWithSub>

          <MenuButton
            onClick={() =>
              onFeedback?.({
                kind: "error",
                text: t("Confirmation file upload is not available yet."),
              })
            }
          >
            {t("Send a confirmation file")}
          </MenuButton>

          <MenuButton
            onClick={() => {
              const comment = window.prompt(t("Add a comment to selected orders"));
              if (comment === null) return;
              void runBulk("Comment update", (order) =>
                updateOrderEditFields(order.id, {
                  internal_comment: comment,
                }).then(() => undefined),
              );
            }}
          >
            {t("Add a comment")}
          </MenuButton>

          <MenuButton
            onClick={() =>
              void runBulk("Comment clear", (order) =>
                updateOrderEditFields(order.id, {
                  internal_comment: "",
                }).then(() => undefined),
              )
            }
          >
            {t("Delete a comment")}
          </MenuButton>

          <MenuButton
            onClick={() =>
              void runBulk("Order refresh", (order) =>
                refreshOrderFromRefurbed(order.id).then(() => undefined),
              )
            }
          >
            {t("Retrieve an order")}
          </MenuButton>

          <MenuButton
            onClick={() =>
              void runBulk("Cancel locally", (order) =>
                updateOrderEditFields(order.id, {
                  workflow_status: "on_hold",
                  payment_status: order.payment_status,
                }).then(() => undefined),
              )
            }
          >
            {t("Mark as cancelled in CelleXa only")}
          </MenuButton>
        </div>
      )}
    </div>
  );
}

function MenuButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function MenuItemWithSub({
  label,
  open,
  onOpen,
  children,
}: {
  label: string;
  open: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={onOpen}>
      <button
        type="button"
        role="menuitem"
        onClick={onOpen}
        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
          open ? "bg-slate-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span>{label}</span>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-full top-0 z-50 ml-1 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

function SubMenuButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function mergeShippingLabelPdfs(
  pdfBlobs: Blob[],
  columns: 1 | 2,
): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();

  if (columns === 1) {
    for (const blob of pdfBlobs) {
      const source = await PDFDocument.load(await blob.arrayBuffer());
      const pages = await merged.copyPages(source, source.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }
  } else {
    // Two labels per A4 portrait page.
    const pageWidth = 595;
    const pageHeight = 842;
    const gap = 12;
    const cellWidth = (pageWidth - gap * 3) / 2;
    const cellHeight = pageHeight - gap * 2;

    for (let index = 0; index < pdfBlobs.length; index += 2) {
      const page = merged.addPage([pageWidth, pageHeight]);
      const pair = pdfBlobs.slice(index, index + 2);
      for (let slot = 0; slot < pair.length; slot += 1) {
        const source = await PDFDocument.load(await pair[slot].arrayBuffer());
        const [embedded] = await merged.embedPdf(source, [0]);
        const sourcePage = source.getPage(0);
        const sourceSize = sourcePage.getSize();
        const scale = Math.min(
          cellWidth / sourceSize.width,
          cellHeight / sourceSize.height,
        );
        const drawWidth = sourceSize.width * scale;
        const drawHeight = sourceSize.height * scale;
        const x = gap + slot * (cellWidth + gap) + (cellWidth - drawWidth) / 2;
        const y = gap + (cellHeight - drawHeight) / 2;
        page.drawPage(embedded, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }
    }
  }

  const bytes = await merged.save();
  return new Blob([bytes], { type: "application/pdf" });
}

function printDocumentStyles(): string {
  return `
      body{font-family:Arial,sans-serif;color:#0f172a;margin:24px}
      h1{font-size:18px;margin:0 0 12px}
      .hint{color:#64748b;font-size:13px;margin:0 0 16px}
      .toolbar{position:sticky;top:0;z-index:2;display:flex;gap:8px;margin:0 0 16px;padding:8px 0;background:#fff}
      .toolbar button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer}
      .slip,.label,.label-card{border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin:0 0 16px;page-break-inside:avoid;break-inside:avoid}
      .label-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px;font-size:13px}
      .label-head a{color:#2563eb}
      .label-frame{width:100%;height:720px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc}
      .meta{color:#64748b;font-size:12px;margin-top:4px}
      .grid-1{display:grid;grid-template-columns:1fr;gap:16px}
      .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .grid-2 .label-frame{height:520px}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      th,td{border-top:1px solid #e2e8f0;padding:6px 4px;text-align:left}
      @media print{
        body{margin:0}
        .toolbar,.hint,.label-head a{display:none!important}
        .slip,.label,.label-card{break-inside:avoid;border:0;padding:0;margin:0 0 12px}
        .label-frame{height:100vh;border:0}
        .grid-2{gap:8px}
      }`;
}

function writePrintDocument(
  popup: Window,
  title: string,
  bodyHtml: string,
  options: { autoPrint?: boolean } = {},
) {
  const { autoPrint = true } = options;
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>${printDocumentStyles()}</style></head><body>
    <div class="toolbar"><button type="button" onclick="window.print()">Print all</button></div>
    <h1>${escapeHtml(title)}</h1>${bodyHtml}
    ${autoPrint ? "<script>window.onload=function(){window.print()}</script>" : ""}
    </body></html>`);
  popup.document.close();
}

function openPrintWindow(
  bodyHtml: string,
  title: string,
  options: { autoPrint?: boolean; wide?: boolean } = {},
) {
  const { autoPrint = true, wide = false } = options;
  const popup = window.open(
    "about:blank",
    "_blank",
    wide ? "width=1200,height=900" : "width=960,height=720",
  );
  if (!popup) return;
  writePrintDocument(popup, title, bodyHtml, { autoPrint });
}

function formatAddress(order: Order): string {
  const address = order.shipping_address;
  if (!address) return "No shipping address";
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    address.company,
    [address.streetName, address.houseNumber].filter(Boolean).join(" ") ||
      address.street,
    address.street2,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.countryCode || address.country,
    address.phoneNumber,
  ]
    .filter((line) => line && String(line).trim())
    .join("<br>");
}

function buildSlipsHtml(orders: Order[], includePrices: boolean): string {
  return orders
    .map((order) => {
      const rows = order.items
        .map((item) => {
          const price = includePrices
            ? `<td>${escapeHtml(item.unit_price)} ${escapeHtml(item.currency)}</td>`
            : "";
          return `<tr><td>${escapeHtml(item.title || item.sku || "Item")}</td><td>${item.quantity}</td>${price}</tr>`;
        })
        .join("");
      const head = includePrices
        ? "<tr><th>Item</th><th>Qty</th><th>Price</th></tr>"
        : "<tr><th>Item</th><th>Qty</th></tr>";
      return `<section class="slip">
        <strong>#${escapeHtml(order.external_order_id)}</strong>
        <div class="meta">${escapeHtml(order.marketplace.name)} · ${escapeHtml(order.customer.name || "")}</div>
        <div class="meta" style="margin-top:8px">${formatAddress(order)}</div>
        <table><thead>${head}</thead><tbody>${rows}</tbody></table>
        ${
          includePrices
            ? `<div class="meta" style="margin-top:8px">Total: ${escapeHtml(order.total_amount)} ${escapeHtml(order.currency)}</div>`
            : ""
        }
      </section>`;
    })
    .join("");
}

