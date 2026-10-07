export interface OrderMarketplace {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export interface OrderAddress {
  id: number | string | null;
  countryCode: string | null;
  country: string | null;
  city: string | null;
  postalCode: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phoneNumber: string | null;
  email: string | null;
  state: string | null;
  street: string | null;
  streetName: string | null;
  houseNumber: string | null;
  street2: string | null;
}

export interface OrderCustomer {
  name: string | null;
  email: string | null;
}

export interface OrderPayment {
  is_paid: boolean;
  paid_amount: string | null;
  refunded_amount: string | null;
  discount_amount: string | null;
}

export interface OrderInvoice {
  is_invoiceable: boolean;
  has_invoice: boolean;
}

export interface OrderShippingLabel {
  id: string;
  normal_printer_urls: Record<string, string>;
  label_printer_url: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  parcel_weight: string | null;
  created_at: string | null;
}

export interface OrderItem {
  id: number;
  external_order_item_id: string;
  external_listing_id: string | null;
  external_product_id: string | null;
  sku: string;
  title: string;
  brand: string | null;
  quantity: number;
  unit_price: string;
  shipping_amount: string;
  commission_amount: string;
  tax_amount: string;
  currency: string;
  status: string;
  condition: string | null;
  return_reason: string | null;
  return_message: string | null;
  item_identifiers: Array<{
    identifier_type: "IMEI" | "SERIAL_NUMBER";
    value: string;
  }>;
  weight_kg: number | null;
  ean: string | null;
}

export interface Order {
  id: number;
  external_order_id: string;
  status: string;
  workflow_status: "open" | "dispatched" | "on_hold";
  country_code: string;
  currency: string;
  subtotal: string;
  shipping_amount: string;
  tax_amount: string;
  total_amount: string;
  payment_method: string | null;
  payment_status:
    "paid" | "refunded" | "partially_refunded" | "waiting_for_payment";
  vat_number: string | null;
  payment: OrderPayment;
  invoice: OrderInvoice;
  customer: OrderCustomer;
  tracking_number: string | null;
  tracking_url: string | null;
  shipper: string | null;
  ordered_at: string | null;
  modified_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  last_synced_at: string | null;
  internal_comment: string | null;
  contact_before: string | null;
  marketplace: OrderMarketplace;
  shipping_address: OrderAddress | null;
  billing_address: OrderAddress | null;
  items: OrderItem[];
  shipping_labels: OrderShippingLabel[];
}

export type OrderDetails = Order;

export interface PaginationLink {
  url: string | null;
  label: string;
  page: number | null;
  active: boolean;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: PaginationLink[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface OrderListResponse {
  success: boolean;
  message?: string;
  data: Order[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

export interface OrderResponse {
  success: boolean;
  message?: string;
  data: {
    order: OrderDetails;
  };
}

export type RefurbedOrderStatus =
  "REJECTED" | "CANCELLED" | "ACCEPTED" | "SHIPPED" | "RETURNED";

export interface UpdateOrderStatusInput {
  status: RefurbedOrderStatus;
  tracking_url?: string;
  item_identifiers?: Array<{
    id: string;
    identifier_type: "IMEI" | "SERIAL_NUMBER";
    value: string;
  }>;
}

export interface OrderFilters {
  search?: string;
  marketplace?: string;
  status?: string;
  country_code?: string;
  page?: number;
  per_page?: number;
}

export type OrderFilterKey = keyof OrderFilters;

export interface OrderFilterOption {
  label: string;
  value: string;
}

export type OrderValidationErrors = Record<string, string[]>;

export interface OrderApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: OrderValidationErrors;
}
