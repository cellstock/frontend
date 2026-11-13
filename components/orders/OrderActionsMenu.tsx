"use client";

import {
  Check,
  ChevronDown,
  Download,
  Eye,
  LoaderCircle,
  Printer,
  ScanBarcode,
  Truck,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Link from "@/components/ui/AppLink";
import {
  createShippingLabel,
  getMerchantAddresses,
  MerchantAddress,
  OrdersApiError,
  // sendOrderBuyerEmail,
  ShippingLabel,
  updateOrderEditFields,
  updateOrderStatus,
  storeOrderInvoiceLocal,
  uploadOrderInvoice,
} from "@/lib/api/orders";
import {
  getShippingCarriers,
  ShippingCarrier,
} from "@/lib/api/shipping-profiles";
import { downloadLatestShippingLabel } from "@/lib/orders/download-shipping-label";
import { buildOrderInvoicePreviewDocument } from "@/lib/orders/download-invoice";
import {
  OrderDocumentPreview,
  type OrderDocument,
} from "@/components/orders/OrderDocumentPreview";
import {
  buildOrderItemIdentifierPayload,
  formatImeiForRefurbed,
  initialItemIdentifierValues,
  itemIdentifierValuesComplete,
  validateItemIdentifierValues,
  sanitizeImeiInput,
  orderItemExpectsSerialNumber,
  orderItemIdentifierFieldLabel,
  type ItemIdentifierValues,
} from "@/lib/orders/item-identifiers";
import { createOrderPdfAsync } from "@/lib/orders/order-pdf";
import type { Order, RefurbedOrderStatus } from "@/types/order";

function orderParcelWeightKg(order: Order): number {
  const total = order.items.reduce((sum, item) => {
    const weight = Number(item.weight_kg);
    const quantity = Number(item.quantity) || 1;
    if (!Number.isFinite(weight) || weight <= 0) return sum;
    return sum + weight * quantity;
  }, 0);
  return total > 0 ? Number(total.toFixed(3)) : 1;
}

const transitions: Record<string, RefurbedOrderStatus[]> = {
  NEW: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["RETURNED"],
};

const labels: Record<RefurbedOrderStatus, string> = {
  ACCEPTED: "Accept",
  REJECTED: "Reject",
  CANCELLED: "Cancel",
  SHIPPED: "Mark as shipped",
  RETURNED: "Mark as returned",
};

export function OrderActionsMenu({
  order,
  onUpdated,
  showViewOrder = true,
}: {
  order: Order;
  onUpdated?: () => Promise<void> | void;
  showViewOrder?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [pendingStatus, setPendingStatus] =
    useState<RefurbedOrderStatus | null>(null);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [invoicePreviewBusy, setInvoicePreviewBusy] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<OrderDocument | null>(
    null,
  );
  const [labelDownloadBusy, setLabelDownloadBusy] = useState(false);
  const canDownloadShippingLabel =
    (order.shipping_labels?.length ?? 0) > 0 ||
    Boolean(order.tracking_url?.trim());

  const availableStatuses = useMemo(() => {
    const slug = order.marketplace.slug ?? "";
    const supported =
      slug === "refurbed" || slug.startsWith("back-market");
    if (!supported || order.items.length === 0) return [];
    const options = order.items.map(
      (item) => transitions[item.status.toUpperCase()] ?? [],
    );
    return (
      options[0]?.filter((status) =>
        options.every((itemOptions) => itemOptions.includes(status)),
      ) ?? []
    );
  }, [order]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);
    window.addEventListener("mousedown", closeOutside);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  function toggleMenu() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 288;
      setPosition({
        top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 420)),
        left: Math.max(
          12,
          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12),
        ),
      });
    }
    setOpen((current) => !current);
    setError("");
  }

  async function changeStatus(
    status: RefurbedOrderStatus,
    trackingUrl?: string,
    itemIdentifiers: NonNullable<
      Parameters<typeof updateOrderStatus>[1]["item_identifiers"]
    > = [],
  ) {
    setBusy(true);
    setError("");
    try {
      await updateOrderStatus(order.id, {
        status,
        ...(trackingUrl ? { tracking_url: trackingUrl } : {}),
        ...((status === "SHIPPED" || status === "RETURNED") &&
        itemIdentifiers.length
          ? { item_identifiers: itemIdentifiers }
          : {}),
      });
      setOpen(false);
      setPendingStatus(null);
      await onUpdated?.();
    } catch (caught) {
      setError(
        caught instanceof OrdersApiError
          ? caught.message
          : "Unable to update this order.",
      );
      await onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenInvoicePreview() {
    if (invoicePreviewBusy) return;
    setInvoicePreviewBusy(true);
    try {
      const document = await buildOrderInvoicePreviewDocument(order);
      setInvoicePreview(document);
    } catch (caught) {
      window.alert(
        caught instanceof OrdersApiError
          ? caught.message
          : "Unable to open the invoice preview. Please try again.",
      );
    } finally {
      setInvoicePreviewBusy(false);
    }
  }

  async function handleDownloadShippingLabel() {
    if (labelDownloadBusy) return;
    setLabelDownloadBusy(true);
    try {
      await downloadLatestShippingLabel(order);
    } catch (caught) {
      window.alert(
        caught instanceof OrdersApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Unable to download the shipping label. Please try again.",
      );
    } finally {
      setLabelDownloadBusy(false);
    }
  }

  return (
    <>
      <div className="inline-flex shrink-0 flex-col gap-1.5 whitespace-nowrap">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDispatch(true)}
            aria-label={`Dispatch order ${order.external_order_id}`}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-blue-500 bg-white px-2.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <Truck className="h-3.5 w-3.5" />
            Dispatch
          </button>
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleMenu}
            aria-expanded={open}
            aria-label={`Actions for order ${order.external_order_id}`}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            Actions <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          disabled={invoicePreviewBusy}
          onClick={() => void handleOpenInvoicePreview()}
          aria-label={`Preview invoice for order ${order.external_order_id}`}
          className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {invoicePreviewBusy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download Invoice
        </button>
        <button
          type="button"
          disabled={labelDownloadBusy || !canDownloadShippingLabel}
          onClick={() => void handleDownloadShippingLabel()}
          aria-label={`Download shipping label for order ${order.external_order_id}`}
          className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {labelDownloadBusy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download Shipping Label
        </button>
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={position}
            className="fixed z-[120] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
          >
            <div className="space-y-1 p-2 text-sm font-normal">
              {showViewOrder && (
                <Link
                  href={`/dashboard/orders/detail/?orderId=${order.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  View order
                </Link>
              )}
              {/* {order.marketplace.slug === "refurbed" && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setShowShippingLabel(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <Printer className="h-4 w-4" />
                  Create shipping label
                </button>
              )} */}
              {availableStatuses.length > 0 && (
                <>
                  {availableStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setOpen(false);
                        setPendingStatus(status);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                    >
                      {busy ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : status === "REJECTED" || status === "CANCELLED" ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {labels[status]}
                    </button>
                  ))}
                </>
              )}
            </div>
            {error && (
              <p
                role="alert"
                className="mx-2 mb-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-normal text-red-700"
              >
                {error}
              </p>
            )}
          </div>,
          document.body,
        )}
      {pendingStatus &&
        createPortal(
          <OrderStatusModal
            order={order}
            status={pendingStatus}
            saving={busy}
            error={error}
            onClose={() => {
              setPendingStatus(null);
              setError("");
            }}
            onConfirm={changeStatus}
          />,
          document.body,
        )}
      {showShippingLabel &&
        createPortal(
          <ShippingLabelModal
            order={order}
            onClose={() => setShowShippingLabel(false)}
            onCreated={onUpdated}
          />,
          document.body,
        )}
      {showDispatch &&
        createPortal(
          <DispatchImeiModal
            order={order}
            onClose={() => setShowDispatch(false)}
            onSaved={onUpdated}
          />,
          document.body,
        )}
      {invoicePreview ? (
        <OrderDocumentPreview
          document={invoicePreview}
          onClose={() => setInvoicePreview(null)}
        />
      ) : null}
    </>
  );
}

function DispatchImeiModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [identifiers, setIdentifiers] = useState<ItemIdentifierValues>(() =>
    initialItemIdentifierValues(order.items),
  );
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const itemKeys = order.items.map((item) => item.external_order_item_id);
  const allFilled =
    order.items.length > 0 && itemIdentifierValuesComplete(order.items, identifiers);
  const isRefurbed = order.marketplace.slug === "refurbed";

  function focusItem(itemKey: string) {
    const input = inputRefs.current[itemKey];
    input?.focus();
    input?.select();
  }

  function focusFirstEmpty() {
    const emptyKey = order.items.find((item) => {
      const key = item.external_order_item_id;
      return !(identifiers[key]?.primary ?? "").trim();
    })?.external_order_item_id;
    focusItem(emptyKey ?? itemKeys[0] ?? "");
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => focusFirstEmpty(), 50);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus first empty once on open
  }, [onClose, saving]);

  function handleScanComplete(itemKey: string) {
    const item = order.items.find(
      (entry) => entry.external_order_item_id === itemKey,
    );
    const raw = identifiers[itemKey]?.primary ?? "";
    const value =
      item && !orderItemExpectsSerialNumber(item)
        ? formatImeiForRefurbed(raw)
        : raw.trim();
    if (!value) {
      setError("Scan or enter an IMEI / serial for each item.");
      focusItem(itemKey);
      return;
    }
    if (value !== raw.trim()) {
      setIdentifiers((current) => ({
        ...current,
        [itemKey]: {
          ...(current[itemKey] ?? { primary: "", secondary: "" }),
          primary: value,
        },
      }));
    }
    setError("");
    const nextItem = order.items.find((entry) => {
      const key = entry.external_order_item_id;
      return key !== itemKey && !(identifiers[key]?.primary ?? "").trim();
    });
    if (nextItem) {
      focusItem(nextItem.external_order_item_id);
    }
  }

  function buildItemIdentifiers() {
    return buildOrderItemIdentifierPayload(order.items, identifiers);
  }

  async function saveDispatch() {
    if (order.items.length === 0) {
      setError("This order has no items to dispatch.");
      return;
    }

    if (!itemIdentifierValuesComplete(order.items, identifiers)) {
      const missing = order.items.find((item) => {
        const key = item.external_order_item_id;
        return !(identifiers[key]?.primary ?? "").trim();
      });
      setError("Scan or enter an IMEI / serial for each item.");
      if (missing) {
        focusItem(missing.external_order_item_id);
      }
      return;
    }

    const validationMessage = validateItemIdentifierValues(
      order.items,
      identifiers,
    );
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const itemIdentifiers = buildItemIdentifiers();
    const warnings: string[] = [];

    setSaving(true);
    setError("");
    setProgress("Saving IMEI details…");

    try {
      await updateOrderEditFields(order.id, {
        workflow_status: "dispatched",
        item_identifiers: itemIdentifiers,
      });

      let trackingUrl = order.tracking_url?.trim() || "";
      let trackingNumber = order.tracking_number?.trim() || "";
      let shipper = order.shipper?.trim() || "DHL Express";

      if (isRefurbed) {
        setProgress("Creating DHL shipping label…");
        const addressesResponse = await getMerchantAddresses(order.id);
        const addresses = addressesResponse.data.merchant_addresses ?? [];
        const deliveryAddress =
          addresses.find(
            (address) => address.type?.toUpperCase() === "DELIVERY",
          ) ?? addresses[0];

        if (!deliveryAddress?.id) {
          throw new OrdersApiError(
            "No merchant address is available to create the DHL shipping label.",
            422,
          );
        }

        const labelResponse = await createShippingLabel(order.id, {
          merchant_address_id: deliveryAddress.id,
          parcel_weight: orderParcelWeightKg(order),
          carrier: "dhl-express",
        });

        const label = labelResponse.data.shipping_label;
        trackingUrl =
          label?.tracking_data?.tracking_url?.trim() || trackingUrl;
        trackingNumber =
          label?.tracking_data?.tracking_number?.trim() || trackingNumber;
        shipper = label?.tracking_data?.carrier?.trim() || "DHL Express";

        setProgress("Updating tracking details…");
        await updateOrderEditFields(order.id, {
          workflow_status: "dispatched",
          shipper,
          ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
          ...(trackingUrl ? { tracking_url: trackingUrl } : {}),
        });

        let itemStatus = (
          order.items[0]?.status ??
          order.status ??
          ""
        ).toUpperCase();

        if (itemStatus === "NEW") {
          setProgress("Accepting order on Refurbed…");
          const accepted = await updateOrderStatus(order.id, {
            status: "ACCEPTED",
          });
          itemStatus = (
            accepted.data.order.items[0]?.status ??
            accepted.data.order.status ??
            "ACCEPTED"
          ).toUpperCase();
        }

        let shippedOnRefurbed = itemStatus === "SHIPPED";

        if (
          !shippedOnRefurbed &&
          itemStatus !== "RETURNED" &&
          itemStatus !== "CANCELLED" &&
          itemStatus !== "REJECTED"
        ) {
          if (!trackingUrl || !/^https?:\/\//i.test(trackingUrl)) {
            warnings.push(
              "Shipping label created, but Refurbed shipment update needs a tracking URL.",
            );
          } else {
            setProgress("Marking order as shipped on Refurbed…");
            await updateOrderStatus(order.id, {
              status: "SHIPPED",
              tracking_url: trackingUrl,
              item_identifiers: itemIdentifiers,
            });
            shippedOnRefurbed = true;
          }
        }

        if (!shippedOnRefurbed && itemIdentifiers.length > 0) {
          setProgress("Syncing IMEI / serial to Refurbed…");
          try {
            await updateOrderEditFields(order.id, {
              item_identifiers: itemIdentifiers,
            });
          } catch (syncError) {
            warnings.push(
              syncError instanceof OrdersApiError
                ? `Refurbed identifiers: ${syncError.message}`
                : "IMEI / serial could not be synced to Refurbed.",
            );
          }
        }

        setProgress("Saving invoice PDF…");
        try {
          const invoiceBlob = await createOrderPdfAsync(order, true);
          const invoiceFile = new File(
            [invoiceBlob],
            `invoice-${order.external_order_id}.pdf`,
            { type: "application/pdf" },
          );
          try {
            await storeOrderInvoiceLocal(order.id, invoiceFile);
          } catch (localError) {
            warnings.push(
              localError instanceof OrdersApiError
                ? `Invoice save: ${localError.message}`
                : "Invoice PDF could not be saved locally.",
            );
          }

          setProgress("Uploading invoice PDF to Refurbed…");
          try {
            await uploadOrderInvoice(order.id, invoiceFile);
          } catch (invoiceError) {
            warnings.push(
              invoiceError instanceof OrdersApiError
                ? `Invoice upload: ${invoiceError.message}`
                : "Invoice PDF could not be uploaded to Refurbed.",
            );
          }
        } catch (invoiceError) {
          warnings.push(
            invoiceError instanceof OrdersApiError
              ? `Invoice PDF: ${invoiceError.message}`
              : invoiceError instanceof Error
                ? `Invoice PDF: ${invoiceError.message}`
                : "Invoice PDF could not be generated.",
          );
        }
      }

      // Customer shipment email disabled for now — re-enable when ready.
      // setProgress("Sending shipment email to customer…");
      // try {
      //   await sendOrderBuyerEmail(order.id, "shipment_confirmation");
      // } catch (emailError) {
      //   warnings.push(
      //     emailError instanceof OrdersApiError
      //       ? `Customer email: ${emailError.message}`
      //       : "Shipment confirmation email could not be sent.",
      //   );
      // }

      onClose();
      if (warnings.length > 0) {
        window.alert(
          `Order dispatched with warnings:\n\n${warnings.join("\n")}`,
        );
      }
    } catch (caught) {
      setError(
        caught instanceof OrdersApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Unable to complete dispatch.",
      );
    } finally {
      setSaving(false);
      setProgress("");
    }

    try {
      await onSaved?.();
    } catch {
      // Refresh failures should not look like a failed dispatch.
    }
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatch-imei-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white text-left shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-sm font-bold text-blue-600">Dispatch</p>
            <h2
              id="dispatch-imei-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              Scan IMEI
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Use your barcode scanner to scan the IMEI for each item. Values
              appear below automatically, then save to dispatch the order.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Order
            </p>
            <p className="mt-1 text-sm font-bold text-blue-600">
              #{order.external_order_id}
            </p>
            <ul className="mt-2 space-y-1">
              {order.items.map((item) => (
                <li key={item.id} className="text-sm text-slate-700">
                  {item.title || item.sku || `Item #${item.id}`}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ScanBarcode className="h-4 w-4 text-blue-600" />
              Identifier
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Point the scanner at each IMEI barcode. Press Enter after typing
              manually to move to the next item.
            </p>
            <div className="mt-3 space-y-4">
              {order.items.map((item, index) => {
                const itemKey = item.external_order_item_id;
                const values = identifiers[itemKey] ?? { primary: "", secondary: "" };
                const itemLabel =
                  order.items.length > 1
                    ? `Device ${index + 1} · ${item.sku || item.title || itemKey}`
                    : item.sku || item.title || itemKey;

                return (
                  <div
                    key={item.id}
                    className="space-y-2 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,1fr)_auto] sm:items-center">
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">
                          {orderItemIdentifierFieldLabel(item)}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {itemLabel}
                        </span>
                      </span>
                      <input
                        ref={(node) => {
                          inputRefs.current[itemKey] = node;
                        }}
                        value={values.primary}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const next = orderItemExpectsSerialNumber(item)
                            ? raw
                            : sanitizeImeiInput(raw);
                          setIdentifiers((current) => ({
                            ...current,
                            [itemKey]: {
                              ...(current[itemKey] ?? {
                                primary: "",
                                secondary: "",
                              }),
                              primary: next,
                            },
                          }));
                          setError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleScanComplete(itemKey);
                          }
                        }}
                        placeholder="Scan or type serial / IMEI"
                        autoComplete="off"
                        disabled={saving}
                        className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        title="Focus field for barcode scanner"
                        aria-label="Focus field for barcode scanner"
                        disabled={saving}
                        onClick={() => {
                          inputRefs.current[itemKey]?.focus();
                          inputRefs.current[itemKey]?.select();
                        }}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-600 transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
                      >
                        <ScanBarcode className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {allFilled && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Ready to save
              </p>
              <ul className="mt-2 space-y-1">
                {buildItemIdentifiers().map((entry, index) => (
                  <li
                    key={`${entry.id}-${entry.identifier_type}-${index}`}
                    className="break-all font-mono text-sm font-semibold text-emerald-900"
                  >
                    {entry.identifier_type}: {entry.value}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-emerald-800">
                Confirm these values and save to dispatch the order.
              </p>
            </div>
          )}

          {progress && (
            <p role="status" className="text-sm font-medium text-blue-700">
              {progress}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !allFilled}
              onClick={() => void saveDispatch()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              {saving ? "Dispatching…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShippingLabelModal({
  order,
  onClose,
  onCreated,
}: {
  order: Order;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState<ShippingLabel | null>(null);
  const [addressId, setAddressId] = useState("");
  const [parcelWeight, setParcelWeight] = useState("");
  const [carrier, setCarrier] = useState("UNSPECIFIED");
  const [labelFormat, setLabelFormat] = useState("");
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [loadingCarriers, setLoadingCarriers] = useState(true);
  const [addresses, setAddresses] = useState<MerchantAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const shippingLabelCarriers = carriers.filter((carrier) =>
    ["ups", "dhl-express"].includes(carrier.slug),
  );
  const deliveryAddresses = addresses.filter(
    (address) => address.type?.toUpperCase() === "DELIVERY",
  );

  useEffect(() => {
    let active = true;

    getShippingCarriers()
      .then((response) => {
        if (active) setCarriers(response.data.carriers);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load stored carriers.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingCarriers(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getMerchantAddresses(order.id)
      .then((response) => {
        if (active) setAddresses(response.data.merchant_addresses);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load merchant addresses from Refurbed.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingAddresses(false);
      });

    return () => {
      active = false;
    };
  }, [order.id]);

  async function createLabel() {
    setSaving(true);
    setError("");

    try {
      const response = await createShippingLabel(order.id, {
        merchant_address_id: addressId,
        parcel_weight: Number(parcelWeight),
        carrier,
      });

      const shippingLabel = response.data.shipping_label;
      if (!shippingLabel) {
        setError("The server did not return a shipping label. Deploy the updated shipping-label endpoint, then check this order before trying again.");
        return;
      }

      setLabel(shippingLabel);
      setLabelFormat(
        shippingLabel.label_printer_url
          ? "label_printer"
          : "top_right",
      );
      setStep(3);
      await onCreated?.();
    } catch (caught) {
      const message =
        caught instanceof OrdersApiError
          ? caught.message
          : "Unable to create the shipping label.";

      setError(
        message.toLowerCase().includes("sendcloud contract id")
          ? "UPS shipping labels require a Sendcloud contract ID configured in your Refurbed merchant account. Select another carrier or configure the UPS contract in Refurbed."
          : message,
      );
    } finally {
      setSaving(false);
    }
  }

  const formats = label
    ? [
        {
          key: "top_right",
          name: "A4 (29.71 × 21.01 cm) · Top-right",
          url: label.normal_printer_urls?.top_right,
        },
        {
          key: "top_left",
          name: "A4 (29.71 × 21.01 cm) · Top-left",
          url: label.normal_printer_urls?.top_left,
        },
        {
          key: "bottom_right",
          name: "A4 (29.71 × 21.01 cm) · Bottom-right",
          url: label.normal_printer_urls?.bottom_right,
        },
        {
          key: "bottom_left",
          name: "A4 (29.71 × 21.01 cm) · Bottom-left",
          url: label.normal_printer_urls?.bottom_left,
        },
        {
          key: "label_printer",
          name: "Label printer · 14.81 × 10.51 cm · Center-center",
          url: label.label_printer_url,
        },
      ].filter((format): format is { key: string; name: string; url: string } =>
        Boolean(format.url),
      )
    : [];
  const selectedLabelUrl = formats.find(
    (format) => format.key === labelFormat,
  )?.url;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-3xl bg-white text-left shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-sm font-bold text-blue-600">Refurbed shipping</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Create shipping label
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Order {order.external_order_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            {["Select origin", "Weight", "Select format"].map((name, index) => {
              const number = index + 1;

              return (
                <div key={name} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      step >= number
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {number}
                  </span>
                  <span className="hidden text-sm font-semibold text-slate-600 sm:block">
                    {name}
                  </span>
                  {number < 3 && <span className="h-px flex-1 bg-slate-200" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {step === 1 && (
            <label className="block text-sm font-semibold text-slate-700">
              Delivery origin
              <select
                required
                value={addressId}
                onChange={(event) => setAddressId(event.target.value)}
                disabled={loadingAddresses || deliveryAddresses.length === 0}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:bg-slate-100"
              >
                <option value="" disabled>
                  {loadingAddresses
                    ? "Loading addresses from Refurbed..."
                    : deliveryAddresses.length === 0
                      ? "No delivery addresses available"
                      : "Select a delivery address"}
                </option>
                {deliveryAddresses.map((address) => {
                  const name =
                    address.label ||
                    address.company_name ||
                    `Address ${address.id}`;
                  const location = [
                    `${address.street_name || ""} ${address.house_no || ""}`.trim(),
                    address.post_code,
                    address.town,
                    address.country_code,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <option key={address.id} value={address.id}>
                      {name} - {location}
                    </option>
                  );
                })}
              </select>
            </label>
          )}

          {step === 2 && (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                Parcel weight
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={parcelWeight}
                  onChange={(event) => setParcelWeight(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Carrier
                <select
                  required
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  disabled={loadingCarriers}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:bg-slate-100"
                >
                  <option value="UNSPECIFIED" disabled>
                    {loadingCarriers ? "Loading carriers..." : "Select carrier"}
                  </option>
                  {shippingLabelCarriers.map((carrier) => (
                    <option key={carrier.slug} value={carrier.slug}>
                      {carrier.name}
                    </option>
                  ))}
                </select>
                {carrier === "ups" && (
                  <span className="mt-2 block text-xs font-medium text-amber-700">
                    UPS requires a Sendcloud contract ID configured in your
                    Refurbed merchant account.
                  </span>
                )}
              </label>
            </>
          )}

          {step === 3 && (
            <div className="space-y-2">
              {formats.map((format) => (
                <label
                  key={format.key}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                    labelFormat === format.key
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Printer className="h-5 w-5 shrink-0" />
                  <span className="flex-1 font-medium">{format.name}</span>
                  <input
                    type="radio"
                    name="label_format"
                    value={format.key}
                    checked={labelFormat === format.key}
                    onChange={() => setLabelFormat(format.key)}
                    className="h-5 w-5 accent-blue-600"
                  />
                </label>
              ))}

              {formats.length === 0 && (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Refurbed created the label but did not return a downloadable
                  PDF URL.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}


          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={step === 1 ? onClose : () => setStep(step - 1)}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step === 1 && (
              <button
                type="button"
                disabled={!addressId}
                onClick={() => setStep(2)}
                className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
              >
                Continue
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={saving || !parcelWeight || Number(parcelWeight) <= 0}
                onClick={createLabel}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {saving ? "Creating label?" : "Create label"}
              </button>
            )}

            {step === 3 && selectedLabelUrl && (
              <a
                href={selectedLabelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
              >
                <Printer className="h-4 w-4" />
                Download shipping label
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderStatusModal({
  order,
  status,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  order: Order;
  status: RefurbedOrderStatus;
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (
    status: RefurbedOrderStatus,
    trackingUrl?: string,
    identifiers?: NonNullable<
      Parameters<typeof updateOrderStatus>[1]["item_identifiers"]
    >,
  ) => Promise<void>;
}) {
  const [modalIdentifiers, setModalIdentifiers] = useState<ItemIdentifierValues>(
    () => initialItemIdentifierValues(order.items),
  );
  const [modalError, setModalError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError("");
    const data = new FormData(event.currentTarget);
    const trackingUrl =
      String(data.get("tracking_url") ?? "").trim() || undefined;

    const itemIdentifiers = buildOrderItemIdentifierPayload(
      order.items,
      modalIdentifiers,
    );

    if (status === "SHIPPED" && itemIdentifiers.length > 0) {
      const validationMessage = validateItemIdentifierValues(
        order.items,
        modalIdentifiers,
      );
      if (validationMessage) {
        setModalError(validationMessage);
        return;
      }
    }

    await onConfirm(status, trackingUrl, itemIdentifiers);
  }
  const field =
    "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white text-left shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-sm font-bold text-blue-600">
              Update order status
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {labels[status]}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This update will be sent to Refurbed and saved in CelleXa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          {status === "SHIPPED" && (
            <>
              <label className="block text-sm font-semibold">
                Parcel tracking URL
                <input
                  required
                  type="url"
                  name="tracking_url"
                  defaultValue={order.tracking_url ?? ""}
                  className={field}
                />
              </label>
              {order.items.map((item, index) => {
                const itemKey = item.external_order_item_id;
                const values =
                  modalIdentifiers[itemKey] ??
                  ({ primary: "", secondary: "" } as const);

                function updateField(raw: string) {
                  const next = orderItemExpectsSerialNumber(item)
                    ? raw
                    : sanitizeImeiInput(raw);
                  setModalIdentifiers((current) => ({
                    ...current,
                    [itemKey]: {
                      ...(current[itemKey] ?? { primary: "", secondary: "" }),
                      primary: next,
                    },
                  }));
                  setModalError("");
                }

                return (
                  <div
                    key={itemKey}
                    className="space-y-3 rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {order.items.length > 1
                        ? `Device ${index + 1}: ${item.title || item.sku}`
                        : item.title || item.sku}
                    </p>
                    <label className="block text-sm font-semibold">
                      {orderItemIdentifierFieldLabel(item)}
                      <input
                        value={values.primary}
                        onChange={(event) => updateField(event.target.value)}
                        className={field}
                        inputMode={
                          orderItemExpectsSerialNumber(item) ? "text" : "numeric"
                        }
                        autoComplete="off"
                      />
                    </label>
                  </div>
                );
              })}
            </>
          )}
          {(modalError || error) && (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {modalError || error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {saving ? "Updating…" : labels[status]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
