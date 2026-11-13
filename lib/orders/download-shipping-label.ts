import { getOrder } from "@/lib/api/orders";
import { publicPath } from "@/lib/public-path";
import type { Order, OrderShippingLabel } from "@/types/order";

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

function openExternalDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.click();
}

export function latestShippingLabel(order: Order): OrderShippingLabel | null {
  const labels = order.shipping_labels ?? [];
  if (labels.length === 0) {
    return null;
  }

  return [...labels].sort((left, right) => {
    const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
    const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return String(left.id).localeCompare(String(right.id));
  })[0];
}

export function shippingLabelDownloadUrl(
  label: OrderShippingLabel,
): string | null {
  const candidates = [
    label.label_printer_url,
    label.normal_printer_urls?.top_left,
    label.normal_printer_urls?.top_right,
    label.normal_printer_urls?.bottom_left,
    label.normal_printer_urls?.bottom_right,
  ];
  return (
    candidates.find((url) => typeof url === "string" && url.trim().length > 0)
      ?.trim() ?? null
  );
}

async function resolveOrderWithLabels(order: Order): Promise<Order> {
  if ((order.shipping_labels?.length ?? 0) > 0) {
    return order;
  }
  const response = await getOrder(order.id);
  return response.data.order;
}

export async function downloadLatestShippingLabel(order: Order): Promise<void> {
  const resolved = await resolveOrderWithLabels(order);
  const label = latestShippingLabel(resolved);
  if (!label) {
    throw new Error("No shipping label is available for this order.");
  }

  const source = shippingLabelDownloadUrl(label);
  if (!source) {
    throw new Error("The shipping label file is not available yet.");
  }

  if (/^https?:\/\//i.test(source)) {
    openExternalDownload(source);
    return;
  }

  const href = publicPath(source.startsWith("/") ? source : `/${source}`);
  const response = await fetch(href, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to download the shipping label.");
  }

  triggerBlobDownload(
    await response.blob(),
    `shipping-label-${resolved.external_order_id}.pdf`,
  );
}
