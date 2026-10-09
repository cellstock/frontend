import { apiFetch } from "@/lib/public-path";
import type {
  OrderApiErrorResponse,
  OrderFilters,
  OrderListResponse,
  OrderResponse,
  OrderValidationErrors,
  UpdateOrderStatusInput,
} from "@/types/order";

export class OrdersApiError extends Error {
  readonly status: number;
  readonly validationErrors: OrderValidationErrors;

  constructor(
    message: string,
    status: number,
    validationErrors: OrderValidationErrors = {},
  ) {
    super(message);

    this.name = "OrdersApiError";
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

export type ShippingLabel = {
  id: string;
  normal_printer_urls: {
    top_left?: string;
    top_right?: string;
    bottom_left?: string;
    bottom_right?: string;
  };
  label_printer_url?: string;
  tracking_data?: {
    carrier?: string;
    tracking_number?: string;
    tracking_url?: string;
  };
  parcel_weight: number;
  merchant_address?: Record<string, unknown>;
};

export type MerchantAddress = {
  id: string;
  version?: string;
  company_name?: string;
  country_code?: string;
  post_code?: string;
  town?: string;
  street_name?: string;
  house_no?: string;
  phone_number?: string;
  type?: string;
  label?: string;
};

export type OrderReturn = {
  id: string;
  order_id: string;
  order_item_id: string;
  instance_name: string;
  item_identifiers?: Array<{ identifier_type: string; value: string }>;
  return_initiated_at: string;
  state: string;
  delivered_at?: string;
  tracking_number?: string;
  tracking_url?: string;
  ticket_topic?: string;
  ticket_url?: string;
  item_within_trial_period: boolean;
  local_order_id?: number | null;
  marketplace_account?: string | null;
};

export function getAllOrderReturns(signal?: AbortSignal): Promise<{
  success: boolean;
  data: { returns: OrderReturn[] };
}> {
  return orderApiRequest("/api/orders/returns", signal);
}

export type RefundCalculation = {
  currency_code: string;
  total_paid: string;
  total_refunded: string;
  refunded: string;
  refunded_refurbed: string;
  refunded_merchant: string;
};

export function getOrderReturns(orderId: number): Promise<{
  success: boolean;
  data: { returns: OrderReturn[] };
}> {
  return orderApiRequest(`/api/orders/${orderId}/returns`);
}

export function calculateOrderRefund(
  orderId: number,
  input: { item_id?: number; target_paid_amount?: string } = {},
): Promise<{ success: boolean; data: { refund: RefundCalculation } }> {
  return orderApiRequest(`/api/orders/${orderId}/refund/calculate`, undefined, {
    method: "POST",
    body: input,
  });
}

export function refundOrder(
  orderId: number,
  input: { item_id?: number; target_paid_amount?: string } = {},
): Promise<{ success: boolean; message: string; data: { operation_id: number } }> {
  return orderApiRequest(`/api/orders/${orderId}/refund`, undefined, {
    method: "POST",
    body: input,
  });
}

export function getMerchantAddresses(orderId: number): Promise<{
  success: boolean;
  data: { merchant_addresses: MerchantAddress[] };
}> {
  return orderApiRequest(`/api/orders/${orderId}/merchant-addresses`);
}

export function createShippingLabel(
  orderId: number,
  input: {
    merchant_address_id: string;
    parcel_weight: number;
    carrier: string;
  },
): Promise<{
  success: boolean;
  message: string;
  data: { shipping_label?: ShippingLabel; operation_id?: number };
}> {
  return orderApiRequest(`/api/orders/${orderId}/shipping-label`, undefined, {
    method: "POST",
    body: input,
  });
}

export function refreshOrderFromRefurbed(
  orderId: number,
): Promise<OrderResponse> {
  return orderApiRequest<OrderResponse>(
    `/api/orders/${orderId}/refresh`,
    undefined,
    { method: "POST" },
  );
}

export function getRefurbedOrderInvoice(
  orderId: number,
): Promise<{ success: boolean; message?: string; data: { url: string | null; operation_id?: number } }> {
  return orderApiRequest(`/api/orders/${orderId}/invoice`);
}

export function updateOrderEditFields(
  orderId: number,
  input: {
    internal_comment?: string;
    contact_before?: string | null;
    workflow_status?: "open" | "dispatched" | "on_hold";
    payment_status?:
      "paid" | "refunded" | "partially_refunded" | "waiting_for_payment";
    vat_number?: string | null;
  },
): Promise<OrderResponse> {
  return orderApiRequest(`/api/orders/${orderId}/edit-fields`, undefined, {
    method: "PATCH",
    body: input,
  });
}

export function updateOrderItemShipping(
  orderId: number,
  itemId: number,
  shippingAmount: string,
): Promise<OrderResponse> {
  return orderApiRequest(
    `/api/orders/${orderId}/items/${itemId}/shipping`,
    undefined,
    { method: "PATCH", body: { shipping_amount: shippingAmount } },
  );
}

export function sendOrderBuyerEmail(
  orderId: number,
  template:
    | "confirmation"
    | "correspondence"
    | "reimbursement"
    | "payment_reminder"
    | "evaluation_reminder"
    | "shipment_confirmation",
): Promise<{ success: boolean; message: string }> {
  return orderApiRequest(`/api/orders/${orderId}/email`, undefined, {
    method: "POST",
    body: { template },
  });
}

export function updateOrderAddress(
  orderId: number,
  type: "shipping" | "billing",
  input: Record<string, unknown>,
): Promise<OrderResponse> {
  return orderApiRequest(`/api/orders/${orderId}/address/${type}`, undefined, {
    method: "PATCH",
    body: input,
  });
}

export async function uploadOrderInvoice(
  orderId: number,
  file: File,
): Promise<{ success: boolean; message: string }> {
  const body = new FormData();
  body.append("file", file);
  const response = await apiFetch(`/api/orders/${orderId}/invoice`, {
    method: "POST",
    credentials: "include",
    body,
  });
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;
  if (!response.ok)
    throw new OrdersApiError(
      payload?.message || "Unable to upload the invoice.",
      response.status,
    );
  return payload as { success: boolean; message: string };
}

function appendTextFilter(
  query: URLSearchParams,
  key: string,
  value: string | undefined,
) {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    query.set(key, normalizedValue);
  }
}

function appendNumberFilter(
  query: URLSearchParams,
  key: string,
  value: number | undefined,
) {
  if (value !== undefined && Number.isInteger(value) && value > 0) {
    query.set(key, String(value));
  }
}

function createOrderQueryString(filters: OrderFilters): string {
  const query = new URLSearchParams();

  appendTextFilter(query, "search", filters.search);
  appendTextFilter(query, "marketplace", filters.marketplace);
  appendTextFilter(query, "status", filters.status);
  appendTextFilter(query, "country_code", filters.country_code);

  appendNumberFilter(query, "page", filters.page);
  appendNumberFilter(query, "per_page", filters.per_page);

  return query.toString();
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isOrderApiErrorResponse(
  value: unknown,
): value is OrderApiErrorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as OrderApiErrorResponse;

  return (
    candidate.message === undefined || typeof candidate.message === "string"
  );
}

async function orderApiRequest<T>(
  endpoint: string,
  signal?: AbortSignal,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
): Promise<T> {
  let response: Response;

  try {
    response = await apiFetch(endpoint, {
      method: "GET",
      ...(options.method ? { method: options.method } : {}),
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new OrdersApiError(
      "Unable to connect to CelleXa. Please try again.",
      0,
    );
  }

  const result = await readJsonResponse(response);
  signal?.throwIfAborted();

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cellexa:session-expired"));
    }

    throw new OrdersApiError(
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  if (!response.ok) {
    const apiError = isOrderApiErrorResponse(result) ? result : null;

    const defaultMessage =
      response.status === 400
        ? "The order request is invalid."
        : response.status === 404
          ? "The requested order was not found."
          : response.status === 422
            ? "One or more order filters are invalid."
            : response.status >= 500
              ? "Something went wrong while retrieving orders."
              : "Unable to complete the order request.";

    throw new OrdersApiError(
      apiError?.message || defaultMessage,
      response.status,
      apiError?.errors ?? {},
    );
  }

  if (result === null) {
    throw new OrdersApiError(
      "The server returned an invalid response.",
      response.status,
    );
  }

  if (
    options.method &&
    options.method !== "GET" &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(new Event("cellexa:data-changed"));
  }

  return result as T;
}

export function updateOrderStatus(
  orderId: number,
  input: UpdateOrderStatusInput,
): Promise<OrderResponse> {
  return orderApiRequest<OrderResponse>(
    `/api/orders/${orderId}/status`,
    undefined,
    { method: "PATCH", body: input },
  );
}

export function getOrders(
  filters: OrderFilters = {},
  signal?: AbortSignal,
): Promise<OrderListResponse> {
  const queryString = createOrderQueryString(filters);

  return orderApiRequest<OrderListResponse>(
    `/api/orders${queryString ? `?${queryString}` : ""}`,
    signal,
  );
}

export function getOrder(
  orderId: number | string,
  signal?: AbortSignal,
): Promise<OrderResponse> {
  const normalizedOrderId = String(orderId).trim();

  if (!/^\d+$/.test(normalizedOrderId)) {
    return Promise.reject(
      new OrdersApiError("The order identifier is invalid.", 400),
    );
  }

  return orderApiRequest<OrderResponse>(
    `/api/orders/${encodeURIComponent(normalizedOrderId)}`,
    signal,
  );
}
