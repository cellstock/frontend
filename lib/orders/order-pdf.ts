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

export type DispatchAddress = {
  company_name: string | null; first_name: string | null; family_name: string | null;
  street_name: string | null; house_no: string | null; post_code: string | null;
  town: string | null; country_code: string | null; phone_number: string | null;
};

// Code 39 wide/narrow symbol encodings (ISO/IEC 16388).
const barcodeAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
const barcodePatterns = [0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00d,0x10c,0x04c,0x01c,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0c1,0x1c0,0x091,0x190,0x0d0,0x085,0x184,0x0c4,0x0a8,0x0a2,0x08a,0x02a];

export function createOrderPdf(order: Order, includePrices = true, sender?: DispatchAddress): Blob {
  const pages: string[] = [];
  let commands: string[] = [];
  const text = (value: unknown, x: number, y: number, size = 9, bold = false) => {
    commands.push("BT /" + (bold ? "F2" : "F1") + " " + size + " Tf 1 0 0 1 " + x + " " + (842-y) + " Tm (" + pdfText(value) + ") Tj ET");
  };
  const line = (x: number, y: number, x2: number, y2: number) => commands.push("0.5 w " + x + " " + (842-y) + " m " + x2 + " " + (842-y2) + " l S");
  const box = (x: number, y: number, w: number, h: number) => commands.push("0.6 w " + x + " " + (842-y-h) + " " + w + " " + h + " re S");
  const wrap = (value: string, length: number) => value.match(new RegExp(".{1,"+length+"}(?:\\s|$)|.{1,"+length+"}", "g")) ?? [""];
  const barcode = (x: number, y: number, width: number) => {
    const value = order.external_order_id;
    if (!value || [...value].some(c => !barcodeAlphabet.includes(c))) {
      text(value, x, y+25, 12, true); return;
    }
    const codes = [0x094, ...[...value].map(c => barcodePatterns[barcodeAlphabet.indexOf(c)]), 0x094];
    const unit = width / (codes.length * 13 - 1 + 20);
    let position = x + 10*unit;
    for (const code of codes) {
      for (let bit=8; bit>=0; bit--) {
        const w = ((code >> bit) & 1 ? 2 : 1)*unit;
        if (bit % 2 === 0) commands.push(position.toFixed(3)+" "+(842-y-42)+" "+w.toFixed(3)+" 42 re f");
        position += w;
      }
      position += unit;
    }
    text(value, x+width/2-value.length*3, y+55, 11, true);
  };
  const footer = () => { text("CelleXa | " + order.marketplace.name, 36, 814, 9, true); text("Page " + (pages.length+1), 515, 814, 8); pages.push(commands.join("\n")); commands=[]; };
  const tableHeader = (y: number) => {
    box(36,y,523,18);text("Quantity",42,y+12,8,true);text("Item(s) details",100,y+12,8,true);
    if(includePrices){text("Unit price",412,y+12,8,true);text("Item total",490,y+12,8,true);}
  };
  const shipping = addressLines(order.shipping_address);
  shipping.slice(0,5).forEach((value,i)=>text(value,36,45+i*14,12,true));
  text("Order number " + order.external_order_id,350,38,8);
  barcode(350,45,210);barcode(36,125,230);
  wrap(order.items[0]?.title ?? "",38).slice(0,4).forEach((value,i)=>text(value,355,120+i*11,8));
  line(36,195,559,195);
  text("Packing slip for order number: " + order.external_order_id,36,215,12,true);
  const billing=addressLines(order.billing_address).flatMap(value=>wrap(value,48));
  const details=["Order date: " + (order.ordered_at ? new Date(order.ordered_at).toLocaleString() : "Not supplied"),
    "Buyer: " + (order.customer.name ?? "Not supplied"),"Marketplace: " + order.marketplace.name,
    "Shipping: " + (order.shipper ?? "Not supplied"),"Billing address:",...billing];
  const detailHeight = Math.max(details.length,shipping.length)*11+30;
  box(36,230,523,detailHeight);text("Order details",44,245,9,true);text("Dispatching to",350,245,9,true);
  details.forEach((value,i)=>text(value,44,260+i*11,8));shipping.forEach((value,i)=>text(value,350,260+i*11,8));
  let y=230+detailHeight+8;tableHeader(y);y+=18;
  for(const item of order.items){
    const rows=[...wrap(item.title || "Untitled item",54),"Condition: " + (item.condition ?? "Not supplied"),"EAN: " + (item.ean ?? "Not supplied"),"SKU: " + (item.sku || "Not supplied")];
    let offset=0;
    while(offset<rows.length){
      if(y>720){footer();text("Packing slip #"+order.external_order_id+" (continued)",36,40,12,true);y=55;tableHeader(y);y+=18;}
      const count=Math.max(1,Math.min(rows.length-offset,Math.floor((755-y-12)/11)));
      const height=count*11+14;box(36,y,523,height);line(88,y,88,y+height);
      if(includePrices){line(400,y,400,y+height);line(480,y,480,y+height);}
      if(offset===0){text(item.quantity,58,y+14,9);if(includePrices){text(money(Number(item.unit_price).toFixed(2),item.currency||order.currency),405,y+14,8);text(money((Number(item.unit_price)*item.quantity).toFixed(2),item.currency||order.currency),485,y+14,8);}}
      rows.slice(offset,offset+count).forEach((value,i)=>text(value,93,y+14+i*11,8,i===0&&offset===0));
      offset+=count;y+=height;
    }
  }
  if(y>540){footer();y=40;}
  if(includePrices){
    for(const [label,value] of [["Items total",order.subtotal],["Total postage",order.shipping_amount],["Tax",order.tax_amount],["Order total",order.total_amount]]){
      box(36,y,523,16);text(label+": "+money(value,order.currency),370,y+11,9,label==="Order total");y+=16;
    }
  }
  y+=23;text("Dispatching from",36,y,10,true);y+=17;
  const senderLines=sender ? [sender.company_name,[sender.first_name,sender.family_name].filter(Boolean).join(" "),[sender.street_name,sender.house_no].filter(Boolean).join(" "),[sender.post_code,sender.town].filter(Boolean).join(" "),sender.country_code,sender.phone_number].filter(Boolean) : ["Dispatch address not selected"];
  senderLines.forEach((value,i)=>text(value,36,y+i*11,8));y+=senderLines.length*11+20;
  barcode(185,y,230);footer();
  return createPdfStreams(pages);
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

function createPdfStreams(pages: string[]): Blob {
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

  const boldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  for (const stream of pages) {
    const streamId = addObject(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
    pageIds.push(
      addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${streamId} 0 R >>`,
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
