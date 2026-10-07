import type { Order } from "@/types/order";

function pdfText(value: unknown): string {
  return String(value ?? "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function money(value: string, currency: string): string {
  return `${value || "0.00"} ${currency || ""}`.trim();
}

export function createOrderPdf(order: Order, includePrices = true): Blob {
  const lines = [
    `CELLEXA ORDER ${order.external_order_id}`,
    "",
    `Marketplace: ${order.marketplace.name}`,
    `Status: ${order.status}`,
    `Order date: ${order.ordered_at ? new Date(order.ordered_at).toLocaleString() : "-"}`,
    `Country: ${order.country_code || "-"}`,
    `Customer: ${order.customer.name || "-"}`,
    `Email: ${order.customer.email || "-"}`,
    "",
    ...(includePrices
      ? [
          `Subtotal: ${money(order.subtotal, order.currency)}`,
          `Shipping: ${money(order.shipping_amount, order.currency)}`,
          `Tax: ${money(order.tax_amount, order.currency)}`,
          `Total: ${money(order.total_amount, order.currency)}`,
          `Payment: ${order.payment.is_paid ? "Paid" : "Pending"}`,
        ]
      : []),
    "",
    `Carrier: ${order.shipper || "-"}`,
    `Tracking number: ${order.tracking_number || "-"}`,
    `Tracking URL: ${order.tracking_url || "-"}`,
    "",
    "ITEMS",
    ...order.items.flatMap((item, index) => [
      `${index + 1}. ${item.title || "Untitled item"}`,
      `   SKU: ${item.sku || "-"}  Qty: ${item.quantity}${includePrices ? `  Price: ${money(item.unit_price, item.currency)}` : ""}`,
      `   Status: ${item.status || "-"}  Condition: ${item.condition || "-"}`,
    ]),
  ];

  return createTextPdf(lines);
}

export function createShippingLabelPdf(order: Order): Blob {
  const address = order.shipping_address;
  return createTextPdf(
    [
      "CELLEXA SHIPPING LABEL",
      "",
      `Order: ${order.external_order_id}`,
      "",
      `${address?.firstName ?? ""} ${address?.lastName ?? ""}`.trim(),
      address?.company ?? "",
      address?.street ?? "",
      address?.street2 ?? "",
      `${address?.postalCode ?? ""} ${address?.city ?? ""}`.trim(),
      address?.country ?? order.country_code,
      "",
      `Phone: ${address?.phoneNumber ?? "-"}`,
    ].filter(Boolean),
  );
}

export function createOrdersPdf(orders: Order[]): Blob {
  const lines = [
    "CELLEXA ORDERS REPORT",
    `Generated: ${new Date().toLocaleString()}`,
    `Orders: ${orders.length}`,
    "",
    ...orders.flatMap((order) => [
      `Order ${order.external_order_id} | ${order.marketplace.name} | ${order.status}`,
      `Date: ${order.ordered_at ? new Date(order.ordered_at).toLocaleString() : "-"}`,
      `Customer: ${order.customer.name || "-"} | Country: ${order.country_code || "-"}`,
      `Total: ${money(order.total_amount, order.currency)} | Payment: ${order.payment.is_paid ? "Paid" : "Pending"}`,
      `Items: ${order.items.map((item) => `${item.sku || "No SKU"} x${item.quantity}`).join(", ") || "-"}`,
      "",
    ]),
  ];

  return createTextPdf(lines);
}

function createTextPdf(lines: string[]): Blob {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 42)
    pages.push(lines.slice(index, index + 42));

  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  );
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const commands = pageLines
      .map((line, index) => {
        const size = index === 0 ? 16 : 10;
        return `/F1 ${size} Tf 1 0 0 1 50 ${790 - index * 17} Tm (${pdfText(line)}) Tj`;
      })
      .join("\n");
    const stream = `BT\n${commands}\nET`;
    const streamId = addObject(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
    pageIds.push(
      addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`,
      ),
    );
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([output], { type: "application/pdf" });
}
