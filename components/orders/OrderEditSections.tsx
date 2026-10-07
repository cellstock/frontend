"use client";

import {
  CalendarDays,
  Copy,
  FileText,
  Info as InfoCircle,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Printer,
  RefreshCw,
  Save,
  Settings,
  Truck,
  Upload,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { createOrderPdf } from "@/lib/orders/order-pdf";
import type { Order, OrderAddress } from "@/types/order";
import {
  OrdersApiError,
  sendOrderBuyerEmail,
  updateOrderAddress,
  updateOrderEditFields,
  uploadOrderInvoice,
} from "@/lib/api/orders";
import { updateOrderStatus } from "@/lib/api/orders";
import type { RefurbedOrderStatus } from "@/types/order";

const statusTransitions: Record<string, RefurbedOrderStatus[]> = {
  NEW: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["RETURNED"],
};

export function OrderEditSections({
  order,
  onRefresh,
  onInvoice,
  orderedItems,
}: {
  order: Order;
  onRefresh: () => void;
  onInvoice: () => void;
  orderedItems: React.ReactNode;
}) {
  const [comment, setComment] = useState(order.internal_comment ?? "");
  const [contactBefore, setContactBefore] = useState(
    order.contact_before ?? "",
  );
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  async function saveNotes() {
    setFeedback(null);
    try {
      await updateOrderEditFields(order.id, {
        internal_comment: comment,
        contact_before: contactBefore || null,
      });
      setSaved(true);
      setFeedback({
        kind: "success",
        text: "Comment and contact reminder saved.",
      });
      onRefresh();
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof OrdersApiError
            ? error.message
            : "Unable to save the order comment.",
      });
    }
  }

  function downloadPdf(kind: "priced" | "plain") {
    const blob = createOrderPdf(order, kind === "priced");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${kind}-${order.external_order_id}.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printShippingLabel() {
    const label = order.shipping_labels[0];
    const url =
      label?.label_printer_url ||
      label?.normal_printer_urls.top_left ||
      label?.normal_printer_urls.top_right ||
      label?.normal_printer_urls.bottom_left ||
      label?.normal_printer_urls.bottom_right;

    if (!url) {
      setFeedback({
        kind: "error",
        text: "Create a Refurbed shipping label before printing it.",
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function uploadInvoice(file: File) {
    setFeedback(null);
    try {
      const response = await uploadOrderInvoice(order.id, file);
      setFeedback({ kind: "success", text: response.message });
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof OrdersApiError
            ? error.message
            : "Unable to upload the invoice.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`rounded-xl border p-4 text-sm font-medium ${feedback.kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {feedback.text}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <section className="grid min-w-0 gap-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:grid-cols-2">
          <Address
            title="Shipping address"
            type="shipping"
            orderId={order.id}
            address={order.shipping_address}
            fallbackEmail={order.customer.email}
            onRefresh={onRefresh}
            onFeedback={setFeedback}
          />
          <Address
            title="Billing address"
            type="billing"
            orderId={order.id}
            address={order.billing_address}
            fallbackEmail={order.customer.email}
            onRefresh={onRefresh}
            onFeedback={setFeedback}
          />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <Printer className="h-5 w-5 text-blue-600" />
            Print documents
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            <Action
              label="Print slip with prices"
              actionLabel="Print"
              onClick={() => downloadPdf("priced")}
            />
            <Action
              label="Print slip without prices"
              actionLabel="Print"
              onClick={() => downloadPdf("plain")}
            />
            <Action
              label="Print shipping label"
              actionLabel="Print"
              onClick={printShippingLabel}
            />
            <Action
              label="Open Refurbed bill"
              actionLabel="Open"
              onClick={onInvoice}
            />
          </div>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-blue-600">
            <Upload className="h-4 w-4" />
            Upload a custom bill
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadInvoice(file);
                event.target.value = "";
              }}
            />
          </label>
        </section>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <FulfilmentEditor
          order={order}
          onRefresh={onRefresh}
          onFeedback={setFeedback}
        />
        <OrderInformation order={order} />
      </div>

      {orderedItems}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <section className="grid min-w-0 gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Comments
            </h2>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">
              Contact customer before
            </h2>
            <input
              type="date"
              value={contactBefore}
              onChange={(event) => setContactBefore(event.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void saveNotes()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white"
            >
              <Save className="h-4 w-4" />
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </section>
        <aside className="space-y-5">
          <SpecificInformation
            order={order}
            onRefresh={onRefresh}
            onFeedback={setFeedback}
          />
          <BuyerEmails order={order} onFeedback={setFeedback} />
        </aside>
      </div>
    </div>
  );
}

function SpecificInformation({
  order,
  onRefresh,
  onFeedback,
}: {
  order: Order;
  onRefresh: () => void;
  onFeedback: (value: { kind: "success" | "error"; text: string }) => void;
}) {
  const [vat, setVat] = useState(order.vat_number ?? "");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await updateOrderEditFields(order.id, {
        vat_number: vat.trim() || null,
      });
      onFeedback({
        kind: "success",
        text: "VAT number saved in CelleXa.",
      });
      onRefresh();
    } catch (error) {
      onFeedback({
        kind: "error",
        text:
          error instanceof OrdersApiError
            ? error.message
            : "Unable to save the VAT number.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer font-bold text-slate-900">
        Edit specific information
      </summary>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_minmax(0,210px)] sm:items-center">
        <label htmlFor="vat-number" className="text-sm font-medium">
          VAT number (CelleXa only)
        </label>
        <input
          id="vat-number"
          value={vat}
          onChange={(event) => setVat(event.target.value)}
          className="min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5"
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-3 ml-auto block rounded-xl border border-blue-500 px-5 py-2 text-sm font-bold text-blue-600 disabled:opacity-50"
      >
        Save
      </button>
    </details>
  );
}

function BuyerEmails({
  order,
  onFeedback,
}: {
  order: Order;
  onFeedback: (value: { kind: "success" | "error"; text: string }) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const templates = [
    ["confirmation", "Confirmation"],
    ["correspondence", "Correspondence"],
    ["reimbursement", "Reimbursement"],
    ["payment_reminder", "Payment reminder"],
    ["evaluation_reminder", "Evaluation reminder"],
    ["shipment_confirmation", "Shipment confirmation"],
  ] as const;
  async function send(template: (typeof templates)[number][0]) {
    setBusy(template);
    try {
      const response = await sendOrderBuyerEmail(order.id, template);
      onFeedback({ kind: "success", text: response.message });
    } catch (error) {
      onFeedback({
        kind: "error",
        text:
          error instanceof OrdersApiError
            ? error.message
            : "Unable to send the buyer email.",
      });
    } finally {
      setBusy(null);
    }
  }
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer font-bold text-slate-900">
        Send email to buyer
      </summary>
      <div className="mt-3 divide-y divide-slate-200">
        {templates.map(([value, label]) => (
          <div
            key={value}
            className="flex items-center justify-between gap-3 py-4"
          >
            <span className="text-sm text-slate-800">{label}</span>
            <button
              type="button"
              disabled={busy !== null || !order.customer.email}
              onClick={() => void send(value)}
              className="rounded-xl border border-blue-500 px-5 py-1.5 text-sm font-bold text-blue-600 disabled:opacity-40"
            >
              {busy === value ? "Sending…" : "Send"}
            </button>
          </div>
        ))}
      </div>
      {!order.customer.email && (
        <p className="mt-3 text-xs text-red-600">
          No buyer email is available for this order.
        </p>
      )}
    </details>
  );
}

function FulfilmentEditor({
  order,
  onRefresh,
  onFeedback,
}: {
  order: Order;
  onRefresh: () => void;
  onFeedback: (value: { kind: "success" | "error"; text: string }) => void;
}) {
  const available = order.items.length
    ? (statusTransitions[order.items[0].status.toUpperCase()] ?? []).filter(
        (status) =>
          order.items.every((item) =>
            (statusTransitions[item.status.toUpperCase()] ?? []).includes(
              status,
            ),
          ),
      )
    : [];
  const [workflowStatus, setWorkflowStatus] = useState<
    Order["workflow_status"]
  >(order.workflow_status);
  const [paymentStatus, setPaymentStatus] = useState<Order["payment_status"]>(
    order.payment_status,
  );
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [identifiers, setIdentifiers] = useState<Record<string, string>>(
    Object.fromEntries(
      order.items.map((item) => [
        item.external_order_item_id,
        item.item_identifiers?.[0]?.value ?? "",
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const mustTrack = workflowStatus === "dispatched";

  async function save() {
    setBusy(true);
    try {
      const itemIdentifiers = order.items.flatMap((item) =>
        identifiers[item.external_order_item_id]?.trim()
          ? [
              {
                id: item.external_order_item_id,
                identifier_type: (item.item_identifiers?.[0]?.identifier_type ??
                  "SERIAL_NUMBER") as "IMEI" | "SERIAL_NUMBER",
                value: identifiers[item.external_order_item_id].trim(),
              },
            ]
          : [],
      );
      const remoteStatus: RefurbedOrderStatus | null =
        workflowStatus === "dispatched" && available.includes("SHIPPED")
          ? "SHIPPED"
          : workflowStatus === "open" && available.includes("ACCEPTED")
            ? "ACCEPTED"
            : null;
      if (remoteStatus)
        await updateOrderStatus(order.id, {
          status: remoteStatus,
          ...(remoteStatus === "SHIPPED"
            ? { tracking_url: trackingUrl.trim() }
            : {}),
          ...(itemIdentifiers.length
            ? { item_identifiers: itemIdentifiers }
            : {}),
        });
      await updateOrderEditFields(order.id, {
        workflow_status: workflowStatus,
        payment_status: paymentStatus,
      });
      onFeedback({
        kind: "success",
        text: remoteStatus
          ? "Order updated on Refurbed and in CelleXa."
          : "Order workflow updated in CelleXa.",
      });
      onRefresh();
    } catch (error) {
      onFeedback({
        kind: "error",
        text:
          error instanceof OrdersApiError
            ? error.message
            : "Unable to update the order.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm sm:p-6">
      <div className="grid min-w-0 gap-8 xl:grid-cols-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-3 font-bold text-slate-900">
            <span className="rounded-full bg-blue-50 p-2 text-blue-600">
              <Truck className="h-5 w-5" />
            </span>
            Shipping options
          </h2>
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center sm:gap-3">
            <label htmlFor="shipping-type">Shipping type</label>
            <input
              id="shipping-type"
              value={order.shipper ?? ""}
              readOnly
              placeholder="Not supplied by Refurbed"
              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            />
            <label htmlFor="tracking-number">Tracking number</label>
            <input
              id="tracking-number"
              value={order.tracking_number ?? ""}
              readOnly
              placeholder="Derived from carrier URL"
              className="min-w-0 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-500"
            />
            <label htmlFor="tracking-url">Tracking URL</label>
            <input
              id="tracking-url"
              type="url"
              value={trackingUrl}
              onChange={(event) => setTrackingUrl(event.target.value)}
              required={mustTrack}
              placeholder="https://carrier.example/track/..."
              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            />
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="flex items-center gap-3 font-bold text-slate-900">
            <span className="rounded-full bg-blue-50 p-2 text-blue-600">
              <Settings className="h-5 w-5" />
            </span>
            Order status
          </h2>
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-3">
            <span>Current status</span>
            <strong className="break-words capitalize">
              {order.status.replaceAll("_", " ").toLowerCase()}
            </strong>
            <label htmlFor="order-status">Workflow status</label>
            <select
              id="order-status"
              value={workflowStatus}
              onChange={(event) =>
                setWorkflowStatus(
                  event.target.value as Order["workflow_status"],
                )
              }
              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="open">Open</option>
              <option value="dispatched">Dispatched</option>
              <option value="on_hold">On hold</option>
            </select>
            <label htmlFor="payment-status">Payment status</label>
            <select
              id="payment-status"
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value as Order["payment_status"])
              }
              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partial refunded</option>
              <option value="waiting_for_payment">Waiting for payment</option>
            </select>
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
            <InfoCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Synchronised with {order.marketplace.name}{" "}
              {formatDate(order.last_synced_at)}
            </span>
          </p>
          <div className="mt-5">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              Identifier <InfoCircle className="h-4 w-4 text-blue-600" />
            </h3>
            <div className="mt-3 space-y-3">
              {order.items.map((item) => (
                <label
                  key={item.id}
                  className="grid min-w-0 gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {item.item_identifiers?.[0]?.identifier_type === "IMEI"
                        ? "IMEI number"
                        : "Serial / IMEI number"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {item.sku}
                    </span>
                  </span>
                  <input
                    value={identifiers[item.external_order_item_id] ?? ""}
                    onChange={(event) =>
                      setIdentifiers((current) => ({
                        ...current,
                        [item.external_order_item_id]: event.target.value,
                      }))
                    }
                    className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled={
          busy ||
          (mustTrack && available.includes("SHIPPED") && !trackingUrl.trim())
        }
        onClick={() => void save()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && <RefreshCw className="h-4 w-4 animate-spin" />}Save changes in
        this section
      </button>
    </section>
  );
}

function OrderInformation({ order }: { order: Order }) {
  const discount =
    Number(order.payment.discount_amount ?? 0) +
    Number(order.payment.refunded_amount ?? 0);
  const commission = order.items.reduce(
    (sum, item) => sum + Number(item.commission_amount || 0),
    0,
  );
  const net = Number(order.total_amount || 0) - commission;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <CalendarDays className="h-5 w-5 text-blue-600" />
        Order information
      </h2>
      <dl className="mt-5 space-y-3 text-sm">
        <InfoRow label="Purchase date" value={formatDate(order.ordered_at)} />
        <InfoRow label="Payment date" value={formatDate(order.paid_at)} />
        <InfoRow label="Order number" value={order.external_order_id} />
        <div className="h-2" />
        <InfoRow label="Items" value={money(order.subtotal, order.currency)} />
        <InfoRow
          label="Delivery"
          value={money(order.shipping_amount, order.currency)}
        />
        <InfoRow label="VAT" value={money(order.tax_amount, order.currency)} />
        <InfoRow
          label="Discounts and reimbursements"
          value={money(-discount, order.currency)}
        />
        <div className="border-t border-slate-200 pt-3">
          <InfoRow
            label="Total"
            value={money(order.total_amount, order.currency)}
            strong
          />
        </div>
      </dl>
      <p className="mt-6 text-sm font-semibold text-blue-600">
        Estimated net gain: {money(net, order.currency)}
      </p>
    </section>
  );
}

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not available";
}
function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-bold text-slate-900" : "text-slate-600"}>
        {label}
      </dt>
      <dd
        className={
          strong ? "font-bold text-slate-900" : "font-medium text-slate-800"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Address({
  title,
  type,
  orderId,
  address: initialAddress,
  fallbackEmail,
  onRefresh,
  onFeedback,
}: {
  title: string;
  type: "shipping" | "billing";
  orderId: number;
  address: OrderAddress | null;
  fallbackEmail: string | null;
  onRefresh: () => void;
  onFeedback: (value: { kind: "success" | "error"; text: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(initialAddress);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      onFeedback({ kind: "success", text: `${label} copied to clipboard.` });
    } catch {
      onFeedback({
        kind: "error",
        text: `Unable to copy ${label.toLowerCase()}.`,
      });
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const response = await updateOrderAddress(
        orderId,
        type,
        Object.fromEntries(data.entries()),
      );
      onFeedback({
        kind: "success",
        text: response.message ?? `${title} updated.`,
      });
      setAddress(
        type === "shipping"
          ? response.data.order.shipping_address
          : response.data.order.billing_address,
      );
      setEditing(false);
      onRefresh();
    } catch (error) {
      onFeedback({
        kind: "error",
        text:
          error instanceof OrdersApiError
            ? error.message
            : `Unable to update the ${title.toLowerCase()}.`,
      });
    }
  }
  const addressText = address
    ? [
        address.street,
        address.street2,
        `${address.postalCode ?? ""} ${address.city ?? ""}`.trim(),
        address.country,
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  if (editing)
    return (
      <form
        onSubmit={(event) => void save(event)}
        className="min-w-0 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">
            Edit {title.toLowerCase()}
          </h2>
          <button type="button" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            name="first_name"
            label="First name"
            value={address?.firstName}
          />
          <Input
            name="family_name"
            label="Last name"
            value={address?.lastName}
          />
          <Input
            name="street_name"
            label="Street"
            value={address?.streetName ?? address?.street}
          />
          <Input
            name="house_no"
            label="House no."
            value={address?.houseNumber}
          />
          <Input name="town" label="City" value={address?.city} />
          <Input
            name="post_code"
            label="Post code"
            value={address?.postalCode}
          />
          <Input
            name="country_code"
            label="Country code"
            value={address?.countryCode}
          />
          <Input
            name="phone"
            label="Phone"
            value={address?.phoneNumber}
            required={type === "shipping"}
          />
          <Input
            name="email"
            label="Email"
            value={address?.email ?? fallbackEmail}
          />
          <Input name="company" label="Company" value={address?.company} />
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
          <Save className="h-4 w-4" />
          Save address
        </button>
      </form>
    );
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
      {address ? (
        <div className="mt-4 space-y-3 text-sm">
          <CopyRow
            icon={UserRound}
            value={`${address.firstName ?? ""} ${address.lastName ?? ""}`.trim()}
            label="Name"
            copy={copy}
          />
          <CopyRow
            icon={MapPin}
            value={addressText}
            label="Address"
            copy={copy}
            multiline
          />
          <CopyRow
            icon={Phone}
            value={address.phoneNumber ?? ""}
            label="Phone number"
            copy={copy}
          />
          <CopyRow
            icon={Mail}
            value={address.email ?? fallbackEmail ?? ""}
            label="Email address"
            copy={copy}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Not available</p>
      )}
    </div>
  );
}
function Input({
  name,
  label,
  value,
  required = false,
}: {
  name: string;
  label: string;
  value: string | null | undefined;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <input
        required={
          required ||
          [
            "first_name",
            "family_name",
            "street_name",
            "town",
            "post_code",
            "country_code",
          ].includes(name)
        }
        name={name}
        defaultValue={value ?? ""}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
function CopyRow({
  icon: Icon,
  value,
  label,
  copy,
  multiline = false,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  copy: (value: string, label: string) => Promise<void>;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span
        className={`min-w-0 flex-1 text-slate-700 ${multiline ? "whitespace-pre-line" : "break-all"}`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        onClick={() => void copy(value, label)}
        className="rounded p-1 text-blue-600 hover:bg-blue-50"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
function Action({
  label,
  actionLabel,
  onClick,
}: {
  label: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between py-3 text-left text-sm text-slate-700 hover:text-blue-700"
    >
      <span className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        {label}
      </span>
      <span className="font-bold text-blue-600">{actionLabel}</span>
    </button>
  );
}
