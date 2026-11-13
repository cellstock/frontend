import type { OrderDocument } from "@/components/orders/OrderDocumentPreview";
import { createOrderPdfAsync } from "@/lib/orders/order-pdf";
import type { Order } from "@/types/order";

/** Always builds the latest CelleXa invoice template (logo + seller profile). */
export async function buildOrderInvoicePreviewDocument(
  order: Order,
): Promise<OrderDocument> {
  const filename = `invoice-${order.external_order_id}.pdf`;
  const blob = await createOrderPdfAsync(order, true);
  return {
    title: `Invoice #${order.external_order_id}`,
    source: blob,
    filename,
  };
}
