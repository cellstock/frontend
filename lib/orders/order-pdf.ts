import type { Order } from "@/types/order";
import { loadSellerLogoForPdf, type SellerLogoPdfAsset } from "@/lib/orders/seller-logo";
import {
  loadSellerInvoiceContext,
  type SellerInvoiceContext,
} from "@/lib/orders/seller-invoice-context";

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

export type DispatchAddress = {
  company_name: string | null; first_name: string | null; family_name: string | null;
  street_name: string | null; house_no: string | null; post_code: string | null;
  town: string | null; country_code: string | null; phone_number: string | null;
};

// Code 39 wide/narrow symbol encodings (ISO/IEC 16388).
const barcodeAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
const barcodePatterns = [0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00d,0x10c,0x04c,0x01c,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0c1,0x1c0,0x091,0x190,0x0d0,0x085,0x184,0x0c4,0x0a8,0x0a2,0x08a,0x02a];

export function createOrderPdf(
  order: Order,
  includePrices = true,
  sender?: DispatchAddress,
  logo?: SellerLogoPdfAsset,
  seller?: SellerInvoiceContext,
): Blob {
  const pages: string[] = [];
  appendOrderSlipPages(pages, order, includePrices, sender, logo, seller);
  const images = logo ? [logo] : [];
  return createPdfStreams(pages, images);
}

export async function createOrderPdfAsync(
  order: Order,
  includePrices = true,
  sender?: DispatchAddress,
): Promise<Blob> {
  const [logo, seller] = await Promise.all([
    loadSellerLogoForPdf(),
    loadSellerInvoiceContext(),
  ]);
  return createOrderPdf(
    order,
    includePrices,
    sender,
    logo ?? undefined,
    seller,
  );
}

/** One combined PDF with a packing slip page (or pages) for every selected order. */
export function createOrderSlipsPdf(
  orders: Order[],
  includePrices = true,
  sender?: DispatchAddress,
  logo?: SellerLogoPdfAsset,
): Blob {
  const pages: string[] = [];
  for (const order of orders) {
    appendOrderSlipPages(pages, order, includePrices, sender, logo, undefined);
  }
  const images = logo ? [logo] : [];
  return createPdfStreams(
    pages.length ? pages : ["BT /F1 12 Tf 1 0 0 1 50 790 Tm (No orders selected) Tj ET"],
    images,
  );
}

export async function createOrderSlipsPdfAsync(
  orders: Order[],
  includePrices = true,
  sender?: DispatchAddress,
): Promise<Blob> {
  const [logo, seller] = await Promise.all([
    loadSellerLogoForPdf(),
    loadSellerInvoiceContext(),
  ]);
  const pages: string[] = [];
  for (const order of orders) {
    appendOrderSlipPages(
      pages,
      order,
      includePrices,
      sender,
      logo ?? undefined,
      seller,
    );
  }
  const images = logo ? [logo] : [];
  return createPdfStreams(
    pages.length
      ? pages
      : ["BT /F1 12 Tf 1 0 0 1 50 790 Tm (No orders selected) Tj ET"],
    images,
  );
}

function invoiceMoney(value: string, currency: string, includeVatLabel = false): string {
  const numeric = Number(value);
  const amount = Number.isFinite(numeric) ? numeric.toFixed(2) : value || "0.00";
  const symbol = currency === "EUR" ? `€${amount}` : `${amount} ${currency || ""}`.trim();
  return includeVatLabel ? `${symbol} Incl VAT` : symbol;
}

function appendOrderSlipPages(
  pages: string[],
  order: Order,
  includePrices = true,
  _sender?: DispatchAddress,
  slipLogo?: SellerLogoPdfAsset,
  seller?: SellerInvoiceContext,
): void {
  const margin = 36;
  const pageWidth = 595;
  const contentWidth = 523;
  const leftColumnWrap = 34;
  const rightColumn = 302;
  const headerBarcodeWidth = 200;
  const vatColumn = 378;
  const totalColumn = 468;
  const firstPageContentLimit = 618;
  const vatNote =
    "GOODS SOLD UNDER MARGINAL VAT SCHEME SECOND HAND GOODS";

  let commands: string[] = [];
  let y = 20;

  const drawText = (
    value: unknown,
    x: number,
    top: number,
    size = 9,
    bold = false,
  ) => {
    commands.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${842 - top} Tm (${pdfText(value)}) Tj ET`,
    );
  };
  const drawLine = (x: number, top: number, x2: number, top2: number) => {
    commands.push(
      `0.6 w ${x} ${842 - top} m ${x2} ${842 - top2} l S`,
    );
  };
  const drawBox = (x: number, top: number, width: number, height: number) => {
    commands.push(
      `0.6 w ${x} ${842 - top - height} ${width} ${height} re S`,
    );
  };
  const wrap = (value: string, length: number) =>
    value.match(new RegExp(`.{1,${length}}(?:\\s|$)|.{1,${length}}`, "g")) ?? [""];
  const drawBarcode = (x: number, top: number, width: number) => {
    const value = order.external_order_id;
    if (!value || [...value].some((character) => !barcodeAlphabet.includes(character))) {
      drawText(value, x, top + 25, 12, true);
      return top + 40;
    }
    const codes = [
      0x094,
      ...[...value].map(
        (character) => barcodePatterns[barcodeAlphabet.indexOf(character)],
      ),
      0x094,
    ];
    const unit = width / (codes.length * 13 - 1 + 20);
    let position = x + 10 * unit;
    for (const code of codes) {
      for (let bit = 8; bit >= 0; bit--) {
        const barWidth = ((code >> bit) & 1 ? 2 : 1) * unit;
        if (bit % 2 === 0) {
          commands.push(
            `${position.toFixed(3)} ${842 - top - 42} ${barWidth.toFixed(3)} 42 re f`,
          );
        }
        position += barWidth;
      }
      position += unit;
    }
    drawText(value, x + width / 2 - value.length * 3, top + 55, 11, true);
    return top + 64;
  };

  const finishPage = () => {
    drawText("CelleXa", margin, 820, 8, true);
    drawText(`Page ${pages.length + 1}`, pageWidth - margin - 40, 820, 8);
    pages.push(commands.join("\n"));
    commands = [];
    y = 48;
  };

  if (slipLogo) {
    const logoX = (pageWidth - slipLogo.displayWidth) / 2;
    const pdfY = 842 - y - slipLogo.displayHeight;
    commands.push(
      `q ${slipLogo.displayWidth} 0 0 ${slipLogo.displayHeight} ${logoX} ${pdfY} cm /${slipLogo.name} Do Q`,
    );
    y += slipLogo.displayHeight + 28;
  } else {
    y = 40;
  }

  const contactSource =
    seller?.contactLines?.length && seller.contactLines.length > 0
      ? seller.contactLines
      : [
          "Configure seller contact",
          "in Seller profile settings.",
        ];
  const contactLines = contactSource
    .flatMap((line) => wrap(line, leftColumnWrap))
    .slice(0, 10);

  const shippingLines = addressLines(order.shipping_address);
  const headerTop = y;

  contactLines.forEach((line, index) => {
    drawText(line, margin, headerTop + index * 11, 9, index === 0);
  });

  drawText("Dispatching to", rightColumn, headerTop, 10, true);
  shippingLines.forEach((line, index) => {
    drawText(line, rightColumn, headerTop + 14 + index * 11, 9);
  });

  const headerBarcodeX = pageWidth - margin - headerBarcodeWidth;
  const headerBarcodeTop =
    headerTop + 14 + shippingLines.length * 11 + 6;
  const headerBarcodeBottom = drawBarcode(
    headerBarcodeX,
    headerBarcodeTop,
    headerBarcodeWidth,
  );

  y =
    Math.max(headerTop + contactLines.length * 11 + 4, headerBarcodeBottom) +
    22;
  drawText(`Invoice number : ${order.id}`, margin, y, 13, true);
  y += 22;

  const billingLines = addressLines(
    order.billing_address ?? order.shipping_address,
  );
  const orderLines = [
    `Order date: ${order.ordered_at ? new Date(order.ordered_at).toLocaleString() : "Not supplied"}`,
    `Order number: ${order.external_order_id}`,
    `Website: ${order.marketplace.name}`,
    `Shipping: ${order.shipper ?? "Standard"}`,
    `Invoice date: ${new Date().toLocaleDateString()}`,
  ];
  const detailsRows = Math.max(orderLines.length + 1, billingLines.length + 1);
  const detailsHeight = detailsRows * 11 + 22;
  drawBox(margin, y, contentWidth, detailsHeight);
  drawText("Order details", margin + 8, y + 14, 9, true);
  drawText("Billing address", rightColumn, y + 14, 9, true);
  orderLines.forEach((line, index) => {
    drawText(line, margin + 8, y + 28 + index * 11, 8);
  });
  billingLines.forEach((line, index) => {
    drawText(line, rightColumn, y + 28 + index * 11, 8);
  });
  y += detailsHeight + 12;

  const drawItemsTableHeader = (top: number) => {
    drawBox(margin, top, contentWidth, 18);
    drawText("Quantity", margin + 8, top + 12, 8, true);
    drawText("Item(s) details", margin + 62, top + 12, 8, true);
    if (includePrices) {
      drawText("VAT", vatColumn + 4, top + 12, 8, true);
      drawText("Total", totalColumn + 4, top + 12, 8, true);
    }
  };

  const ensureRoomForItems = (needed: number) => {
    const limit = pages.length === 0 ? firstPageContentLimit : 700;
    if (y + needed > limit) {
      finishPage();
      drawText(`Invoice #${order.external_order_id} (continued)`, margin, y, 11, true);
      y += 20;
      drawItemsTableHeader(y);
      y += 18;
    }
  };

  drawItemsTableHeader(y);
  y += 18;

  for (const item of order.items) {
    const itemLines = [
      item.title || "Untitled item",
      `Category: ${item.category ?? "Not supplied"}`,
      `Condition: ${item.condition ?? "Not supplied"}`,
      `EAN: ${item.ean ?? "Not supplied"}`,
      `SKU: ${item.sku || "Not supplied"}`,
    ].flatMap((line) => wrap(line, includePrices ? 38 : 72));

    let offset = 0;
    while (offset < itemLines.length) {
      const remaining = itemLines.length - offset;
      const count = Math.max(
        1,
        Math.min(remaining, Math.floor((700 - y - 80) / 11)),
      );
      ensureRoomForItems(count * 11 + 20);
      const rowHeight = count * 11 + 14;
      drawBox(margin, y, contentWidth, rowHeight);
      drawLine(margin + 52, y, margin + 52, y + rowHeight);
      if (includePrices) {
        drawLine(vatColumn, y, vatColumn, y + rowHeight);
        drawLine(totalColumn, y, totalColumn, y + rowHeight);
      }
      if (offset === 0) {
        drawText(item.quantity, margin + 20, y + 14, 9);
        if (includePrices) {
          wrap(vatNote, 16).forEach((line, index) => {
            drawText(line, vatColumn + 4, y + 14 + index * 11, 7);
          });
          drawText(
            invoiceMoney(
              (Number(item.unit_price) * item.quantity).toFixed(2),
              item.currency || order.currency,
              true,
            ),
            totalColumn + 4,
            y + 14,
            8,
            true,
          );
        }
      }
      itemLines.slice(offset, offset + count).forEach((line, index) => {
        drawText(line, margin + 58, y + 14 + index * 11, 8, index === 0 && offset === 0);
      });
      offset += count;
      y += rowHeight;
    }
  }

  if (includePrices) {
    const shippingHeight = 18;
    drawBox(margin, y, contentWidth, shippingHeight);
    drawLine(margin + 52, y, margin + 52, y + shippingHeight);
    drawLine(vatColumn, y, vatColumn, y + shippingHeight);
    drawLine(totalColumn, y, totalColumn, y + shippingHeight);
    drawText("1", margin + 20, y + 12, 9);
    drawText("Shipping and handling", margin + 58, y + 12, 9);
    drawText(
      invoiceMoney(order.shipping_amount, order.currency),
      totalColumn + 4,
      y + 12,
      8,
    );
    y += shippingHeight;

    const totalHeight = 18;
    drawBox(margin, y, contentWidth, totalHeight);
    drawLine(margin + 52, y, margin + 52, y + totalHeight);
    drawLine(vatColumn, y, vatColumn, y + totalHeight);
    drawLine(totalColumn, y, totalColumn, y + totalHeight);
    drawText("Total", margin + 58, y + 12, 9, true);
    drawText(
      invoiceMoney(order.total_amount, order.currency, true),
      totalColumn + 4,
      y + 12,
      9,
      true,
    );
    y += totalHeight + 18;
  }

  const footerLines =
    seller?.footerLines?.length && seller.footerLines.length > 0
      ? seller.footerLines
      : [
          `Payment date: ${new Date().toLocaleDateString()}`,
          "Goods sold under marginal VAT scheme for second-hand goods.",
        ];
  footerLines.slice(0, 3).forEach((line) => {
    const parts = wrap(line, 105).slice(0, 2);
    parts.forEach((part, index) => {
      drawText(part, margin, y + index * 10, 8);
    });
    y += parts.length > 1 ? 20 : 12;
  });

  const bottomBarcodeWidth = 250;
  const barcodeTop = Math.min(Math.max(y + 14, 668), 710);
  drawBarcode(
    (pageWidth - bottomBarcodeWidth) / 2,
    barcodeTop,
    bottomBarcodeWidth,
  );
  finishPage();
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

function addressLines(address: Order["shipping_address"]): string[] {
  if (!address) return ["Not supplied"];
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    address.company,
    address.street,
    address.street2,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country ?? address.countryCode,
    address.phoneNumber,
    address.email,
  ].filter((value): value is string => Boolean(value));
}

function createTextPdf(sourceLines: string[]): Blob {
  const lines = sourceLines.flatMap(
    (line) => line.match(/.{1,88}(?:\s|$)|.{1,88}/g) ?? [""],
  );
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 42)
    pages.push(lines.slice(index, index + 42));

  return createPdfStreams(pages.map(pageLines => "BT\n" + pageLines.map((line,index) => "/F1 10 Tf 1 0 0 1 50 " + (790-index*17) + " Tm (" + pdfText(line) + ") Tj").join("\n") + "\nET"));
}

type PdfSegment = { kind: "text"; value: string } | { kind: "binary"; value: Uint8Array };

function createPdfStreams(pages: string[], images: SellerLogoPdfAsset[] = []): Blob {
  const parts: PdfSegment[] = [{ kind: "text", value: "%PDF-1.4\n" }];
  const objectOffsets: number[] = [0];

  const byteLength = () =>
    parts.reduce(
      (total, segment) =>
        total + (segment.kind === "text" ? segment.value.length : segment.value.byteLength),
      0,
    );

  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  const boldId = 4;
  let nextObjectId = 5;

  const imageRefs = images.map((image) => ({
    image,
    id: nextObjectId++,
  }));
  const streamIds = pages.map(() => nextObjectId++);
  const pageIds = pages.map(() => nextObjectId++);
  const objectCount = nextObjectId;

  const xObjectDictionary = imageRefs.length
    ? ` /XObject << ${imageRefs.map(({ image, id }) => `/${image.name} ${id} 0 R`).join(" ")} >>`
    : "";

  const writeTextObject = (objectId: number, content: string) => {
    objectOffsets[objectId] = byteLength();
    parts.push({ kind: "text", value: `${objectId} 0 obj\n${content}\nendobj\n` });
  };

  const writeImageObject = (objectId: number, image: SellerLogoPdfAsset) => {
    objectOffsets[objectId] = byteLength();
    parts.push({
      kind: "text",
      value:
        `${objectId} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${image.pixelWidth} /Height ${image.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${image.filter} /Length ${image.bytes.length} >>\nstream\n`,
    });
    parts.push({ kind: "binary", value: image.bytes });
    parts.push({ kind: "text", value: "\nendstream\nendobj\n" });
  };

  writeTextObject(
    catalogId,
    `<< /Type /Catalog /Pages ${pagesId} 0 R >>`,
  );
  writeTextObject(
    pagesId,
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );
  writeTextObject(fontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  writeTextObject(boldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  for (const { image, id } of imageRefs) {
    writeImageObject(id, image);
  }
  for (let index = 0; index < pages.length; index++) {
    const stream = pages[index];
    const streamId = streamIds[index];
    const pageId = pageIds[index];
    writeTextObject(
      streamId,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
    writeTextObject(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >>${xObjectDictionary} >> /Contents ${streamId} 0 R >>`,
    );
  }

  const xrefOffset = byteLength();
  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let objectId = 1; objectId < objectCount; objectId++) {
    xref += `${String(objectOffsets[objectId] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objectCount} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push({ kind: "text", value: xref });

  return new Blob(
    parts.map((segment) =>
      segment.kind === "text" ? segment.value : (segment.value as BlobPart),
    ),
    { type: "application/pdf" },
  );
}
