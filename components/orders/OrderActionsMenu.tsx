"use client";

import {
  Check,
  ChevronDown,
  Eye,
  LoaderCircle,
  Printer,
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
  ShippingLabel,
  updateOrderStatus,
} from "@/lib/api/orders";
import {
  getShippingCarriers,
  ShippingCarrier,
} from "@/lib/api/shipping-profiles";
import type { Order, RefurbedOrderStatus } from "@/types/order";

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

  const availableStatuses = useMemo(() => {
    if (order.marketplace.slug !== "refurbed" || order.items.length === 0)
      return [];
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
        ...(itemIdentifiers.length
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-expanded={open}
        aria-label={`Actions for order ${order.external_order_id}`}
        className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
      >
        Actions <ChevronDown className="h-4 w-4" />
      </button>
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
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  View order
                </Link>
              )}
              {order.marketplace.slug === "refurbed" && (
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
              )}
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
      {pendingStatus && (
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
        />
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
    </>
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
  const [notice, setNotice] = useState("");
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
    setNotice("");

    try {
      const response = await createShippingLabel(order.id, {
        merchant_address_id: addressId,
        parcel_weight: Number(parcelWeight),
        carrier,
      });

      const shippingLabel = response.data.shipping_label;
      if (!shippingLabel) {
        setNotice(response.message);
        await onCreated?.();
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

          {notice && (
            <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
              {notice}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={step === 1 || notice ? onClose : () => setStep(step - 1)}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
            >
              {step === 1 ? "Cancel" : notice ? "Close" : "Back"}
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
                disabled={saving || Boolean(notice) || !parcelWeight || Number(parcelWeight) <= 0}
                onClick={createLabel}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {notice ? "Queued" : "Create label"}
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const trackingUrl =
      String(data.get("tracking_url") ?? "").trim() || undefined;
    const identifiers = order.items.flatMap((item) => {
      const value = String(
        data.get(`identifier_${item.external_order_item_id}`) ?? "",
      ).trim();
      return value
        ? [
            {
              id: item.external_order_item_id,
              identifier_type:
                item.item_identifiers?.[0]?.identifier_type ?? "SERIAL_NUMBER",
              value,
            },
          ]
        : [];
    });
    await onConfirm(status, trackingUrl, identifiers);
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
              {order.items.map((item) => (
                <label
                  key={item.external_order_item_id}
                  className="block text-sm font-semibold"
                >
                  IMEI or serial number{" "}
                  <span className="font-normal text-slate-400">
                    ({item.title})
                  </span>
                  <input
                    name={`identifier_${item.external_order_item_id}`}
                    defaultValue={item.item_identifiers?.[0]?.value ?? ""}
                    className={field}
                  />
                </label>
              ))}
            </>
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
