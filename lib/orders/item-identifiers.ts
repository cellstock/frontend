import type { OrderItem } from "@/types/order";

import { formatImeiForRefurbed } from "@/lib/orders/imei";

export type OrderItemIdentifierEntry = {
  id: string;
  identifier_type: "IMEI" | "SERIAL_NUMBER";
  value: string;
};

export type ItemIdentifierValues = Record<
  string,
  { primary: string; secondary: string }
>;

type IdentifierItem = Pick<
  OrderItem,
  "title" | "sku" | "brand" | "item_identifiers" | "external_order_item_id"
>;

function productHaystack(item: IdentifierItem): string {
  return [item.title, item.sku, item.brand].filter(Boolean).join(" ").toLowerCase();
}

/** Refurbed expects SERIAL_NUMBER on iPads; phones use IMEI (one per device, including Dual-SIM). */
export function orderItemExpectsSerialNumber(item: IdentifierItem): boolean {
  return /\bipad\b/.test(productHaystack(item));
}

export function orderItemIdentifierFieldLabel(item: IdentifierItem): string {
  if (orderItemExpectsSerialNumber(item)) {
    return "Serial number";
  }
  return "IMEI number";
}

export function resolveOrderItemIdentifierType(
  item: IdentifierItem,
): "IMEI" | "SERIAL_NUMBER" {
  return orderItemExpectsSerialNumber(item) ? "SERIAL_NUMBER" : "IMEI";
}

export function readStoredItemIdentifiers(
  item: OrderItem,
): { primary: string; secondary: string } {
  const stored = item.item_identifiers ?? [];
  if (orderItemExpectsSerialNumber(item)) {
    const serial =
      stored.find((entry) => entry.identifier_type === "SERIAL_NUMBER")?.value ??
      stored[0]?.value ??
      "";
    return { primary: serial, secondary: "" };
  }

  const imei =
    stored.find((entry) => entry.identifier_type === "IMEI")?.value ??
    stored.find((entry) => /^\d{15}$/.test(entry.value.trim()))?.value ??
    stored[0]?.value ??
    "";

  return { primary: imei, secondary: "" };
}

export function initialItemIdentifierValues(
  items: OrderItem[],
): ItemIdentifierValues {
  return Object.fromEntries(
    items.map((item) => [
      item.external_order_item_id,
      readStoredItemIdentifiers(item),
    ]),
  );
}

/** One identifier payload entry per order line, keyed by Refurbed order item id. */
export function buildOrderItemIdentifierPayload(
  items: OrderItem[],
  values: ItemIdentifierValues,
): OrderItemIdentifierEntry[] {
  return items.flatMap((item) => {
    const key = item.external_order_item_id;
    const primary = values[key]?.primary?.trim() ?? "";
    if (!primary) {
      return [];
    }

    const identifierType = resolveOrderItemIdentifierType(item);
    const value =
      identifierType === "SERIAL_NUMBER" ? primary : formatImeiForRefurbed(primary);

    return [
      {
        id: key,
        identifier_type: identifierType,
        value,
      },
    ];
  });
}

/** Digits only; keep up to 20 chars so 16-digit scans are not truncated early. */
export function sanitizeImeiInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 20);
}

export { formatImeiForRefurbed } from "@/lib/orders/imei";

export function validateItemIdentifierValues(
  items: OrderItem[],
  values: ItemIdentifierValues,
): string | null {
  for (const item of items) {
    const key = item.external_order_item_id;
    const primary = values[key]?.primary?.trim() ?? "";

    if (orderItemExpectsSerialNumber(item)) {
      if (!primary) {
        return "Enter a serial number for each item.";
      }
      continue;
    }

    if (!primary) {
      return "Enter an IMEI for each item.";
    }
  }

  return null;
}

export function itemIdentifierValuesComplete(
  items: OrderItem[],
  values: ItemIdentifierValues,
): boolean {
  return items.every((item) => {
    const key = item.external_order_item_id;
    return (values[key]?.primary?.trim() ?? "").length > 0;
  });
}
